declare module 'multer' {
  namespace multer {
    interface Limits {
      fileSize?: number
      files?: number
      fields?: number
      fieldSize?: number
      parts?: number
    }

    interface Options {
      storage?: StorageEngine
      limits?: Limits
    }

    type StorageEngine = object

    interface Multer {
      single(fieldName: string): import('express').RequestHandler
      array(fieldName: string, maxCount?: number): import('express').RequestHandler
    }

    function memoryStorage(): StorageEngine
  }

  function multer(options?: multer.Options): multer.Multer
  namespace multer {
    export { memoryStorage }
  }

  export = multer
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string
      originalname: string
      encoding: string
      mimetype: string
      size: number
      destination: string
      filename: string
      path: string
      buffer: Buffer
    }
  }

  interface Request {
    file?: Multer.File
    files?: Multer.File[] | Record<string, Multer.File[]>
  }
}
