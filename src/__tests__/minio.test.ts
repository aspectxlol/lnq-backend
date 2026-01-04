// Tests for src/services/minio.ts
// These are pure unit tests: they never require a real MinIO instance.

type PutObjectArgs = {
  bucket: string;
  objectName: string;
  buffer: Buffer;
  length: number;
  meta: Record<string, string>;
};

const mockClient = {
  bucketExists: jest.fn<Promise<boolean>, [string]>(),
  makeBucket: jest.fn<Promise<void>, [string, string]>(),
  putObject: jest.fn<Promise<void>, [
    string,
    string,
    Buffer,
    number,
    Record<string, string>
  ]>(),
  removeObject: jest.fn<Promise<void>, [string, string]>(),
};

jest.mock('minio', () => {
  return {
    Client: jest.fn(() => mockClient),
  };
});

function resetEnv() {
  delete process.env.MINIO_ENDPOINT;
  delete process.env.MINIO_PORT;
  delete process.env.MINIO_BUCKET_NAME;
  delete process.env.MINIO_USE_SSL;
  delete process.env.MINIO_ACCESS_KEY;
  delete process.env.MINIO_SECRET_KEY;
}

describe('MinIO service', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    resetEnv();
  });

  describe('when NODE_ENV=test', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      process.env.MINIO_BUCKET_NAME = 'test-bucket';
    });

    it('initializeMinIO is a no-op (no bucket calls)', async () => {
      const minio = await import('../services/minio');
      await minio.initializeMinIO();

      expect(mockClient.bucketExists).not.toHaveBeenCalled();
      expect(mockClient.makeBucket).not.toHaveBeenCalled();
    });

    it('uploadImage returns a deterministic id and does not call putObject', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const minio = await import('../services/minio');

      const id = await minio.uploadImage('file.png', Buffer.from('abc'), 'image/png');

      expect(id).toBe('1234567890-file.png');
      expect(mockClient.putObject).not.toHaveBeenCalled();

      nowSpy.mockRestore();
    });

    it('deleteImage is a no-op (no removeObject calls)', async () => {
      const minio = await import('../services/minio');
      await minio.deleteImage('anything');

      expect(mockClient.removeObject).not.toHaveBeenCalled();
    });
  });

  describe('when NODE_ENV!=test', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.MINIO_BUCKET_NAME = 'images-dev';
      process.env.MINIO_ENDPOINT = 'localhost';
      process.env.MINIO_PORT = '9000';
    });

    it('initializeMinIO creates bucket when missing', async () => {
      mockClient.bucketExists.mockResolvedValueOnce(false);
      mockClient.makeBucket.mockResolvedValueOnce();

      const minio = await import('../services/minio');
      await minio.initializeMinIO();

      expect(mockClient.bucketExists).toHaveBeenCalledWith('images-dev');
      expect(mockClient.makeBucket).toHaveBeenCalledWith('images-dev', 'us-east-1');
    });

    it('initializeMinIO does not create bucket when it exists', async () => {
      mockClient.bucketExists.mockResolvedValueOnce(true);

      const minio = await import('../services/minio');
      await minio.initializeMinIO();

      expect(mockClient.bucketExists).toHaveBeenCalledWith('images-dev');
      expect(mockClient.makeBucket).not.toHaveBeenCalled();
    });

    it('uploadImage calls putObject with correct args and returns objectName', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(222);
      mockClient.putObject.mockResolvedValueOnce();

      const minio = await import('../services/minio');

      const buf = Buffer.from('fake');
      const id = await minio.uploadImage('x.webp', buf, 'image/webp');

      expect(id).toBe('222-x.webp');
      expect(mockClient.putObject).toHaveBeenCalledTimes(1);

      const [bucket, objectName, buffer, length, meta] = mockClient.putObject.mock.calls[0] as unknown as [
        string,
        string,
        Buffer,
        number,
        Record<string, string>
      ];

      expect(bucket).toBe('images-dev');
      expect(objectName).toBe('222-x.webp');
      expect(buffer).toBe(buf);
      expect(length).toBe(buf.length);
      expect(meta).toEqual({ 'Content-Type': 'image/webp' });

      nowSpy.mockRestore();
    });

    it('deleteImage calls removeObject with bucket + id', async () => {
      mockClient.removeObject.mockResolvedValueOnce();

      const minio = await import('../services/minio');
      await minio.deleteImage('abc');

      expect(mockClient.removeObject).toHaveBeenCalledWith('images-dev', 'abc');
    });

    it('getImageUrl uses MINIO env vars and bucket name', async () => {
      const minio = await import('../services/minio');
      const url = minio.getImageUrl('img123');
      expect(url).toBe('http://localhost:9000/images-dev/img123');
    });
  });
});
