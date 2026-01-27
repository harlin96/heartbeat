/*
 * 心跳验证系统 - C# SDK
 * 适用于 .NET Framework 4.5+ / .NET Core / .NET 5+
 */

using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.IO;

namespace HeartbeatSDK
{
    public class HeartbeatClient : IDisposable
    {
        private readonly string _serverUrl;
        private readonly string _appKey;
        private readonly HttpClient _httpClient;
        private string _token;
        private string _deviceId;
        private CancellationTokenSource _heartbeatCts;
        private Task _heartbeatTask;

        public event Action<HeartbeatResult> OnExpired;
        public event Action<HeartbeatResult> OnError;

        public HeartbeatClient(string serverUrl, string appKey)
        {
            _serverUrl = serverUrl.TrimEnd('/');
            _appKey = appKey;
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        }

        public string GetDeviceId()
        {
            if (!string.IsNullOrEmpty(_deviceId)) return _deviceId;

            string info = $"{Environment.MachineName}-{Environment.ProcessorCount}-{Environment.OSVersion}";
            using (var md5 = MD5.Create())
            {
                byte[] hash = md5.ComputeHash(Encoding.UTF8.GetBytes(info));
                _deviceId = BitConverter.ToString(hash).Replace("-", "").ToLower();
            }
            return _deviceId;
        }

        public void SetDeviceId(string deviceId) => _deviceId = deviceId;
        public void SetToken(string token) => _token = token;
        public string Token => _token;

        public async Task<ActivateResult> ActivateAsync(string cardKey, string extraInfo = null)
        {
            try
            {
                var payload = new { card_key = cardKey, device_id = GetDeviceId(), extra_info = extraInfo };
                var response = await PostAsync("/api/cards/activate", payload);

                if (response.GetProperty("success").GetBoolean())
                {
                    _token = response.GetProperty("token").GetString();
                    return new ActivateResult
                    {
                        Success = true,
                        Message = response.GetProperty("message").GetString(),
                        Token = _token,
                        ExpiresAt = DateTime.Parse(response.GetProperty("expires_at").GetString()),
                        RemainingDays = response.GetProperty("remaining_days").GetInt32()
                    };
                }
                return new ActivateResult { Success = false, Message = response.GetProperty("message").GetString() };
            }
            catch (Exception ex)
            {
                return new ActivateResult { Success = false, Message = $"网络错误: {ex.Message}" };
            }
        }

        public async Task<HeartbeatResult> HeartbeatAsync()
        {
            if (string.IsNullOrEmpty(_token))
                return new HeartbeatResult { Success = false, Message = "未激活" };

            try
            {
                var payload = new { app_key = _appKey, token = _token, device_id = GetDeviceId() };
                var response = await PostAsync("/api/heartbeat", payload);

                return new HeartbeatResult
                {
                    Success = response.GetProperty("success").GetBoolean(),
                    Message = response.GetProperty("message").GetString(),
                    RemainingSeconds = response.TryGetProperty("remaining_seconds", out var rs) ? rs.GetInt32() : 0
                };
            }
            catch (Exception ex)
            {
                return new HeartbeatResult { Success = false, Message = $"网络错误: {ex.Message}" };
            }
        }

        public void StartHeartbeat(int intervalSeconds = 60)
        {
            if (_heartbeatTask != null) return;

            _heartbeatCts = new CancellationTokenSource();
            _heartbeatTask = Task.Run(async () =>
            {
                while (!_heartbeatCts.Token.IsCancellationRequested)
                {
                    var result = await HeartbeatAsync();
                    if (!result.Success)
                    {
                        if (result.Message.Contains("过期")) OnExpired?.Invoke(result);
                        else OnError?.Invoke(result);
                    }
                    await Task.Delay(intervalSeconds * 1000, _heartbeatCts.Token);
                }
            }, _heartbeatCts.Token);
        }

        public void StopHeartbeat()
        {
            _heartbeatCts?.Cancel();
            _heartbeatTask = null;
        }

        public void SaveToken(string filepath = "heartbeat_token.txt")
        {
            if (!string.IsNullOrEmpty(_token))
                File.WriteAllText(filepath, $"{_token}\n{_deviceId}");
        }

        public bool LoadToken(string filepath = "heartbeat_token.txt")
        {
            if (!File.Exists(filepath)) return false;
            var lines = File.ReadAllLines(filepath);
            if (lines.Length > 0) _token = lines[0];
            if (lines.Length > 1) _deviceId = lines[1];
            return !string.IsNullOrEmpty(_token);
        }

        private async Task<JsonElement> PostAsync(string path, object data)
        {
            var json = JsonSerializer.Serialize(data);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(_serverUrl + path, content);
            var body = await response.Content.ReadAsStringAsync();
            return JsonDocument.Parse(body).RootElement;
        }

        public void Dispose()
        {
            StopHeartbeat();
            _httpClient?.Dispose();
        }
    }

    public class ActivateResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string Token { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int? RemainingDays { get; set; }
    }

    public class HeartbeatResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int? RemainingSeconds { get; set; }
    }
}

/* 使用示例:
using HeartbeatSDK;

var client = new HeartbeatClient("http://your-server.com", "your-app-key");

// 激活卡密
var result = await client.ActivateAsync("XXXX-XXXX-XXXX-XXXX");
if (result.Success)
{
    Console.WriteLine($"激活成功! 到期: {result.ExpiresAt}");
    client.SaveToken();
    
    // 启动自动心跳
    client.OnExpired += r => Console.WriteLine("授权已过期!");
    client.StartHeartbeat(60);
}
*/
