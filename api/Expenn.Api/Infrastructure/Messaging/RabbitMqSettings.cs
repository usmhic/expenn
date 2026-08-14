namespace Expenn.Api.Infrastructure.Messaging;

public class RabbitMqSettings
{
    public bool Enabled { get; set; } = false;
    public string Host { get; set; } = "localhost";
    public ushort Port { get; set; } = 5672;
    public string VirtualHost { get; set; } = "/";
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
}
