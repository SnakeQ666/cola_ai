declare module 'ali-oss' {
  export default class OSS {
    constructor(options: any)
    put(name: string, file: any, options?: any): Promise<any>
    get(name: string, file?: string, options?: any): Promise<any>
    delete(name: string, options?: any): Promise<any>
    signatureUrl(name: string, options?: any): string
    list(query?: any, options?: any): Promise<any>
    [key: string]: any
  }
}

