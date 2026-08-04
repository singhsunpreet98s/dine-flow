using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using DineFlow.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace DineFlow.Infrastructure.Services;

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _client;
    private const string ContainerName = "menu-images";

    public BlobStorageService(IConfiguration config)
    {
        var connStr = config["AzureStorage:ConnectionString"] ?? "UseDevelopmentStorage=true";
        _client = new BlobServiceClient(connStr);
    }

    public async Task<string> UploadAsync(Stream stream, string fileName, string contentType, CancellationToken ct = default)
    {
        var container = _client.GetBlobContainerClient(ContainerName);
        await container.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: ct);

        var blobName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var blob = container.GetBlobClient(blobName);
        await blob.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);
        return blob.Uri.ToString();
    }

    public async Task DeleteAsync(string blobUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(blobUrl)) return;
        var uri = new Uri(blobUrl);
        var blobName = uri.Segments.Last();
        var container = _client.GetBlobContainerClient(ContainerName);
        await container.GetBlobClient(blobName).DeleteIfExistsAsync(cancellationToken: ct);
    }
}
