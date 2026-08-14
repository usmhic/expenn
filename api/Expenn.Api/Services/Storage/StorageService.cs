using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Expenn.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Expenn.Api.Services.Storage;

public class StorageService : IStorageService
{
    private readonly StorageSettings _settings;
    private readonly IAmazonS3 _s3;

    public StorageService(IOptions<StorageSettings> opts)
    {
        _settings = opts.Value;
        _s3 = new AmazonS3Client(
            new BasicAWSCredentials(_settings.AccessKey, _settings.SecretKey),
            new AmazonS3Config
            {
                ServiceURL = _settings.Endpoint,
                ForcePathStyle = _settings.UsePathStyle,
                AuthenticationRegion = "us-east-1",
            }
        );
    }

    public async Task<UploadResult> UploadAsync(Stream stream, string fileName, string mimeType, string orgId, string userId, string prefix, CancellationToken ct = default)
    {
        var ext = Path.GetExtension(fileName);
        var key = $"{orgId}/{userId}/{prefix}/{Guid.NewGuid()}{ext}";

        var request = new PutObjectRequest
        {
            BucketName = _settings.Bucket,
            Key = key,
            InputStream = stream,
            ContentType = mimeType,
            AutoCloseStream = false,
        };

        await _s3.PutObjectAsync(request, ct);

        return new UploadResult(key, GetPublicUrl(key), stream.Length, mimeType);
    }

    public async Task DeleteAsync(string key, CancellationToken ct = default)
    {
        await _s3.DeleteObjectAsync(_settings.Bucket, key, ct);
    }

    public string GetPublicUrl(string key)
    {
        var endpoint = (_settings.PublicUrl.Length > 0 ? _settings.PublicUrl : _settings.Endpoint).TrimEnd('/');
        return $"{endpoint}/{_settings.Bucket}/{key}";
    }
}
