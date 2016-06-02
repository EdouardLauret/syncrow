// Generated by typings
// Source: https://raw.githubusercontent.com/typed-typings/npm-form-data/edc32200ec6065d98bfaa7ff9cfd104e17c5d3e4/lib/form_data.d.ts
declare module '~request~form-data/lib/form_data' {
class FormData {
  static LINE_BREAK: string;
  static DEFAULT_CONTENT_TYPE: string;

  append (key: string, value: any, options?: string | FormData.Options): FormData;
  getHeaders <T> (userHeaders?: T): T & FormData.Headers;
  getCustomHeaders (contentType?: string): FormData.CustomHeaders;
  getBoundary (): string;
  getLengthSync (): number;
  getLength (cb: (error: Error, length?: number) => any): void;
  submit (params: string | Object, cb: (error: Error, response?: any) => any): any;
  pipe <T> (to: T): T;
}

module FormData {
  export interface Options {
    filename: string;
  }

  export interface Headers {
    'content-type': string;
  }

  export interface CustomHeaders extends Headers {
    'content-length': string;
  }
}

export = FormData;
}
declare module '~request~form-data' {
import alias = require('~request~form-data/lib/form_data');
export = alias;
}

// Generated by typings
// Source: https://raw.githubusercontent.com/typed-typings/npm-tough-cookie/3e37dc2e6d448130d2fa4be1026e195ffda2b398/lib/cookie.d.ts
declare module '~request~tough-cookie/lib/cookie' {
/**
 * Parse a cookie date string into a Date. Parses according to RFC6265
 * Section 5.1.1, not Date.parse().
 */
export function parseDate (date: string): Date;

/**
 * Format a Date into a RFC1123 string (the RFC6265-recommended format).
 */
export function formatDate (date: Date): string;

/**
 * Transforms a domain-name into a canonical domain-name. The canonical domain-name
 * is a trimmed, lowercased, stripped-of-leading-dot and optionally punycode-encoded
 * domain-name (Section 5.1.2 of RFC6265). For the most part, this function is
 * idempotent (can be run again on its output without ill effects).
 */
export function canonicalDomain (domain: string): string;

/**
 * Answers "does this real domain match the domain in a cookie?". The str is the
 * "current" domain-name and the domStr is the "cookie" domain-name. Matches
 * according to RFC6265 Section 5.1.3, but it helps to think of it as a "suffix match".
 *
 * The canonicalize parameter will run the other two paramters through canonicalDomain or not.
 */
export function domainMatch (str: string, domStr: string, canonicalize?: boolean): boolean;

/**
 * Given a current request/response path, gives the Path apropriate for storing in
 * a cookie. This is basically the "directory" of a "file" in the path, but is
 * specified by Section 5.1.4 of the RFC.
 *
 * The path parameter MUST be only the pathname part of a URI (i.e. excludes the hostname,
 * query, fragment, etc.). This is the .pathname property of node's uri.parse() output.
 */
export function defaultPath (path: string): string;

/**
 * Answers "does the request-path path-match a given cookie-path?" as
 * per RFC6265 Section 5.1.4. Returns a boolean.
 *
 * This is essentially a prefix-match where cookiePath is a prefix of reqPath.
 */
export function pathMatch (reqPath: string, cookiePath: string): boolean;

/**
 * alias for Cookie.parse(cookieString[, options])
 */
export function parse (cookieString: string, options?: CookieParseOptions): Cookie;

/**
 * alias for Cookie.fromJSON(string)
 */
export function fromJSON (json: string): Cookie;

/**
 * Returns the public suffix of this hostname. The public suffix is the shortest
 * domain-name upon which a cookie can be set. Returns null if the hostname cannot
 * have cookies set for it.
 *
 * For example: www.example.com and www.subdomain.example.com both have public suffix example.com.
 *
 * For further information, see http://publicsuffix.org/. This module derives its list from that site.
 */
export function getPublicSuffix (hostname: string): string;

/**
 * For use with .sort(), sorts a list of cookies into the recommended order
 * given in the RFC (Section 5.4 step 2). The sort algorithm is, in order of precedence:

 * - Longest .path
 * - oldest .creation (which has a 1ms precision, same as Date)
 * - lowest .creationIndex (to get beyond the 1ms precision)
 *
 * ```
 * var cookies = [ \/* unsorted array of Cookie objects *\/ ];
 * cookies = cookies.sort(cookieCompare);
 * ```
 *
 * Note: Since JavaScript's Date is limited to a 1ms precision, cookies within
 * the same milisecond are entirely possible. This is especially true when using
 * the now option to .setCookie(). The .creationIndex property is a per-process
 * global counter, assigned during construction with new Cookie(). This preserves
 * the spirit of the RFC sorting: older cookies go first. This works great for
 * MemoryCookieStore, since Set-Cookie headers are parsed in order, but may not
 * be so great for distributed systems. Sophisticated Stores may wish to set this
 * to some other logical clock such that if cookies A and B are created in the
 * same millisecond, but cookie A is created before cookie B, then
 * A.creationIndex < B.creationIndex. If you want to alter the global counter,
 * which you probably shouldn't do, it's stored in Cookie.cookiesCreated.
 */
export function cookieCompare (a: Cookie, b: Cookie): number;

/**
 * Generates a list of all possible domains that domainMatch() the parameter.
 * May be handy for implementing cookie stores.
 */
export function permuteDomain (domain: string): string[];

/**
 * Generates a list of all possible paths that pathMatch() the parameter.
 * May be handy for implementing cookie stores.
 */
export function permutePath (path: string): string[];

/**
 * Base class for CookieJar stores. Available as tough.Store.
 */
export class Store {
  // TODO(blakeembrey): Finish this.
  // https://github.com/SalesforceEng/tough-cookie#store
}

/**
 * A just-in-memory CookieJar synchronous store implementation, used by default.
 * Despite being a synchronous implementation, it's usable with both the
 * synchronous and asynchronous forms of the CookieJar API.
 */
export class MemoryCookieStore extends Store {}

/**
 * Exported via tough.Cookie.
 */
export class Cookie {
  /**
   * Parses a single Cookie or Set-Cookie HTTP header into a Cookie object. Returns
   * undefined if the string can't be parsed.
   *
   * The options parameter is not required and currently has only one property:
   *
   * - loose - boolean - if true enable parsing of key-less cookies like =abc and =, which are not RFC-compliant.
   * If options is not an object, it is ignored, which means you can use Array#map with it.
   *
   * Here's how to process the Set-Cookie header(s) on a node HTTP/HTTPS response:
   *
   * ```
   * if (res.headers['set-cookie'] instanceof Array)
   *   cookies = res.headers['set-cookie'].map(Cookie.parse);
   * else
   *   cookies = [Cookie.parse(res.headers['set-cookie'])];
   * ```
   */
  static parse (cookieString: string, options?: CookieParseOptions): Cookie;

  /**
   * the name or key of the cookie (default "")
   */
  key: string;

  /**
   * the value of the cookie (default "")
   */
  value: string;

  /**
   * if set, the Expires= attribute of the cookie (defaults to the string "Infinity").
   * See setExpires()
   */
  expires: Date;

  /**
   * (seconds) if set, the Max-Age= attribute in seconds of the cookie. May also
   * be set to strings "Infinity" and "-Infinity" for non-expiry and immediate-expiry,
   * respectively. See setMaxAge()
   */
  maxAge: number;

  /**
   * the Domain= attribute of the cookie
   */
  domain: string;

  /**
   * the Path= of the cookie
   */
  path: string;

  /**
   * the Secure cookie flag
   */
  secure: boolean;

  /**
   * the HttpOnly cookie flag
   */
  httpOnly: boolean;

  /**
   * any unrecognized cookie attributes as strings (even if equal-signs inside)
   */
  extensions: string[];

  /**
   * when this cookie was constructed
   */
  creation: Date;

  /**
   * set at construction, used to provide greater sort precision
   * (please see cookieCompare(a,b) for a full explanation)
   */
  creationIndex: number;

  /**
   * is this a host-only cookie (i.e. no Domain field was set, but was instead implied)
   */
  hostOnly: boolean;

  /**
   * if true, there was no Path field on the cookie and defaultPath() was used to derive one.
   */
  pathIsDefault: boolean;

  /**
   * last time the cookie got accessed. Will affect cookie cleaning once
   * implemented. Using cookiejar.getCookies(...) will update this attribute.
   */
  lastAccessed: Date;

  /**
   * encode to a Set-Cookie header value. The Expires cookie field is set
   * using formatDate(), but is omitted entirely if .expires is Infinity.
   */
  toString (): string;

  /**
   * encode to a Cookie header value (i.e. the .key and .value properties joined with '=').
   */
  cookieString (): string;

  /**
   * sets the expiry based on a date-string passed through parseDate(). If parseDate
   * returns null (i.e. can't parse this date string), .expires is set to "Infinity" (a string) is set.
   */
  setExpires (expires: string): void;

  /**
   * sets the maxAge in seconds. Coerces -Infinity to "-Infinity" and
   * Infinity to "Infinity" so it JSON serializes correctly.
   */
  setMaxAge (maxAge: number): void;

  /**
   * expiryTime() Computes the absolute unix-epoch milliseconds that this cookie
   * expires. expiryDate() works similarly, except it returns a Date object. Note
   * that in both cases the now parameter should be milliseconds.
   *
   * Max-Age takes precedence over Expires (as per the RFC). The .creation
   * attribute -- or, by default, the now paramter -- is used to offset the .maxAge attribute.
   *
   * If Expires (.expires) is set, that's returned.
   *
   * Otherwise, expiryTime() returns Infinity and expiryDate() returns a Date
   * object for "Tue, 19 Jan 2038 03:14:07 GMT" (latest date that can be
   * expressed by a 32-bit time_t; the common limit for most user-agents).
   */
  expiryTime (now?: number): number;
  expiryDate (now?: number): Date;

  /**
   * compute the TTL relative to now (milliseconds). The same precedence rules
   * as for expiryTime/expiryDate apply.
   *
   * The "number" Infinity is returned for cookies without an explicit
   * expiry and 0 is returned if the cookie is expired. Otherwise a time-to-live
   * in milliseconds is returned.
   */
  TTL (now?: number): number;

  /**
   * return the canonicalized .domain field. This is lower-cased and punycode
   * (RFC3490) encoded if the domain has any non-ASCII characters.
   */
  cdomain (): string;
  canonicalizedDomain (): string;

  /**
   * For convenience in using JSON.serialize(cookie). Returns a plain-old Object that can be JSON-serialized.
   *
   * Any Date properties (i.e., .expires, .creation, and .lastAccessed) are
   * exported in ISO format (.toISOString()).
   *
   * NOTE: Custom Cookie properties will be discarded. In tough-cookie 1.x, since
   * there was no .toJSON method explicitly defined, all enumerable properties were
   * captured. If you want a property to be serialized, add the property name to
   * the Cookie.serializableProperties Array.
   */
  toJSON (): Object;

  /**
   * Does the reverse of cookie.toJSON(). If passed a string, will JSON.parse() that first.
   *
   * Any Date properties (i.e., .expires, .creation, and .lastAccessed) are parsed
   * via Date.parse(), not the tough-cookie parseDate, since it's JavaScript/JSON-y
   * timestamps being handled at this layer.
   *
   * Returns null upon JSON parsing error.
   */
  static fromJSON (json: string): Cookie;

  /**
   * Does a deep clone of this cookie, exactly implemented as Cookie.fromJSON(cookie.toJSON()).
   */
  clone (): Cookie;
}

export interface CookieParseOptions {
  loose: boolean;
}

export interface SetCookieOptions {
  /**
   * default true - indicates if this is an HTTP or non-HTTP API. Affects HttpOnly cookies.
   */
  http?: boolean;

  /**
   * autodetect from url - indicates if this is a "Secure" API. If the currentUrl
   * starts with https: or wss: then this is defaulted to true, otherwise false.
   */
  secure?: boolean;

  /**
   * default new Date() - what to use for the creation/access time of cookies
   */
  now?: Date;

  /**
   * default false - silently ignore things like parse errors and invalid
   * domains. Store errors aren't ignored by this option.
   */
  ignoreError?: boolean;
}

export interface GetCookieOptions {
  /**
   * default true - indicates if this is an HTTP or non-HTTP API. Affects HttpOnly cookies.
   */
  http?: boolean;

  /**
   * autodetect from url - indicates if this is a "Secure" API. If the currentUrl
   * starts with https: or wss: then this is defaulted to true, otherwise false.
   */
  secure?: boolean;

  /**
   * default new Date() - what to use for the creation/access time of cookies
   */
  now?: Date;

  /**
   * default true - perform expiry-time checking of cookies and asynchronously
   * remove expired cookies from the store. Using false will return expired cookies
   * and not remove them from the store (which is useful for replaying Set-Cookie headers, potentially).
   */
  expire?: boolean;

  /**
   * default false - if true, do not scope cookies by path. The default uses
   * RFC-compliant path scoping. Note: may not be supported by the underlying
   * store (the default MemoryCookieStore supports it).
   */
  allPaths?: boolean;
}

export interface CookieJarOptions {
  /**
   * default true - reject cookies with domains like "com" and "co.uk"
   */
  rejectPublicSuffixes: boolean;

  /**
   * default false - accept malformed cookies like bar and =bar, which have an
   * implied empty name. This is not in the standard, but is used sometimes
   * on the web and is accepted by (most) browsers.
   */
  looseMode: boolean;
}

/**
 * Simply use new CookieJar(). If you'd like to use a custom store, pass that
 * to the constructor otherwise a MemoryCookieStore will be created and used.
 */
export class CookieJar {
  enableLooseMode: boolean;
  rejectPublicSuffixes: boolean;

  constructor (store?: Store, options?: boolean | CookieJarOptions);

  /**
   * Attempt to set the cookie in the cookie jar. If the operation fails, an
   * error will be given to the callback cb, otherwise the cookie is passed
   * through. The cookie will have updated .creation, .lastAccessed and .hostOnly properties.
   */
  setCookie (cookieOrString: string | Cookie, currentUrl: string, cb: (err: Error, cookie?: Cookie) => any): void;
  setCookie (cookieOrString: string | Cookie, currentUrl: string, options: SetCookieOptions, cb: (err: Error, cookie?: Cookie) => any): void;

  /**
   * Synchronous version of setCookie; only works with synchronous stores
   * (e.g. the default MemoryCookieStore).
   */
  setCookieSync (cookieOrString: string | Cookie, currentUrl: string, options?: SetCookieOptions): void;

  /**
   * Retrieve the list of cookies that can be sent in a Cookie header for the current url.
   *
   * If an error is encountered, that's passed as err to the callback, otherwise
   * an Array of Cookie objects is passed. The array is sorted with cookieCompare()
   * unless the {sort:false} option is given.
   */
  getCookies (currentUrl: string, cb: (err: Error, cookies?: Cookie[]) => any): void;
  getCookies (currentUrl: string, options: GetCookieOptions, cb: (err: Error, cookies?: Cookie[]) => any): void;

  /**
   * Synchronous version of getCookies; only works with synchronous stores
   * (e.g. the default MemoryCookieStore).
   */
  getCookiesSync (currentUrl: string, options?: GetCookieOptions): Cookie[];

  /**
   * Accepts the same options as .getCookies() but passes a string suitable
   * for a Cookie header rather than an array to the callback. Simply maps the
   * Cookie array via .cookieString().
   */
  getCookieString (currentUrl: string, cb: (err: Error, cookies?: string) => any): void;
  getCookieString (currentUrl: string, options: GetCookieOptions, cb: (err: Error, cookies?: string) => any): void;

  /**
   * Synchronous version of getCookieString; only works with synchronous stores
   * (e.g. the default MemoryCookieStore).
   */
  getCookieStringSync (currentUrl: string, options?: GetCookieOptions): string;

  /**
   * Serialize the Jar if the underlying store supports .getAllCookies.
   *
   * NOTE: Custom Cookie properties will be discarded. If you want a property
   * to be serialized, add the property name to the Cookie.serializableProperties Array.
   *
   * See [Serialization Format].
   */
  serialize (cb: (error: Error, serializedObject: Object) => any): void;

  /**
   * Sync version of .serialize
   */
  serializeSync (): Object;

  /**
   * Alias of .serializeSync() for the convenience of JSON.stringify(cookiejar).
   */
  toJSON (): Object;

  /**
   * A new Jar is created and the serialized Cookies are added to the
   * underlying store. Each Cookie is added via store.putCookie in the order
   * in which they appear in the serialization.
   *
   * The store argument is optional, but should be an instance of Store. By
   * default, a new instance of MemoryCookieStore is created.
   *
   * As a convenience, if serialized is a string, it is passed through
   * JSON.parse first. If that throws an error, this is passed to the callback.
   */
  static deserialize (serialized: string | Object, cb: (error: Error, object: Object) =>any): CookieJar;
  static deserialize (serialized: string | Object, store: Store, cb: (error: Error, object: Object) => any): CookieJar;

  /**
   * Sync version of .deserialize. Note that the store must be synchronous
   * for this to work.
   */
  static deserializeSync (serialized: string | Object, store: Store): Object;

  /**
   * Alias of .deserializeSync to provide consistency with Cookie.fromJSON().
   */
  static fromJSON (string: string): Object;

  /**
   * Produces a deep clone of this jar. Modifications to the original won't
   * affect the clone, and vice versa.
   *
   * The store argument is optional, but should be an instance of Store. By
   * default, a new instance of MemoryCookieStore is created. Transferring
   * between store types is supported so long as the source implements
   * .getAllCookies() and the destination implements .putCookie().
   */
  clone (cb: (error: Error, newJar: CookieJar) => any): void;
  clone (store: Store, cb: (error: Error, newJar: CookieJar) => any): void;

  /**
   * Synchronous version of .clone, returning a new CookieJar instance.
   *
   * The store argument is optional, but must be a synchronous Store instance
   * if specified. If not passed, a new instance of MemoryCookieStore is used.
   *
   * The source and destination must both be synchronous Stores. If one or both
   * stores are asynchronous, use .clone instead. Recall that MemoryCookieStore
   * supports both synchronous and asynchronous API calls.
   */
  cloneSync (store?: Store): CookieJar;
}
}
declare module '~request~tough-cookie' {
import alias = require('~request~tough-cookie/lib/cookie');
export = alias;
}

// Generated by typings
// Source: https://raw.githubusercontent.com/louy/typed-request/8dbbc8c9c3aee44d1ca00ac82a88a00f37198e1d/index.d.ts
declare module '~request/index' {
import {Stream} from 'stream';
import {Agent, ClientRequest, IncomingMessage} from 'http';
import * as FormData from '~request~form-data';
import * as toughCookie from '~request~tough-cookie';

var request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;

namespace request {
  export interface RequestAPI<TRequest extends Request,
    TOptions extends CoreOptions,
    TUriUrlOptions> {

    defaults(options: TOptions): RequestAPI<TRequest, TOptions, RequiredUriUrl>;
    defaults(options: RequiredUriUrl & TOptions): DefaultUriUrlRequestApi<TRequest, TOptions, OptionalUriUrl>;

    (uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
    (uri: string, callback?: RequestCallback): TRequest;
    (options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

    get(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
    get(uri: string, callback?: RequestCallback): TRequest;
    get(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

    post(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
    post(uri: string, callback?: RequestCallback): TRequest;
    post(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

    put(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
    put(uri: string, callback?: RequestCallback): TRequest;
    put(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

    head(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
    head(uri: string, callback?: RequestCallback): TRequest;
    head(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

    patch(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
    patch(uri: string, callback?: RequestCallback): TRequest;
    patch(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

    del(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
    del(uri: string, callback?: RequestCallback): TRequest;
    del(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

    forever(agentOptions: any, optionsArg: any): TRequest;
    jar(): CookieJar;
    cookie(str: string): Cookie;

    initParams: any;
    debug: boolean;
  }

  interface DefaultUriUrlRequestApi<TRequest extends Request,
    TOptions extends CoreOptions,
    TUriUrlOptions>	extends RequestAPI<TRequest, TOptions, TUriUrlOptions> {

    defaults(options: TOptions): DefaultUriUrlRequestApi<TRequest, TOptions, OptionalUriUrl>;
    defaults(options: RequiredUriUrl & TOptions): DefaultUriUrlRequestApi<TRequest, TOptions, OptionalUriUrl>;
    (): TRequest;
    get(): TRequest;
    post(): TRequest;
    put(): TRequest;
    head(): TRequest;
    patch(): TRequest;
    del(): TRequest;
  }

  interface CoreOptions {
    baseUrl?: string;
    callback?: (error: any, response: IncomingMessage, body: any) => void;
    jar?: boolean | CookieJar;
    formData?: any; // Object
    form?: any; // Object or string
    auth?: AuthOptions;
    oauth?: OAuthOptions;
    aws?: AWSOptions;
    hawk?: HawkOptions;
    qs?: any;
    json?: any;
    multipart?: RequestPart[] | Multipart;
    agentOptions?: any;
    agentClass?: any;
    forever?: any;
    host?: string;
    port?: number;
    method?: string;
    headers?: Headers;
    body?: any;
    followRedirect?: boolean | ((response: IncomingMessage) => boolean);
    followAllRedirects?: boolean;
    maxRedirects?: number;
    encoding?: string;
    pool?: any;
    timeout?: number;
    proxy?: any;
    strictSSL?: boolean;
    gzip?: boolean;
    preambleCRLF?: boolean;
    postambleCRLF?: boolean;
    key?: Buffer;
    cert?: Buffer;
    passphrase?: string;
    ca?: Buffer;
    har?: HttpArchiveRequest;
    useQuerystring?: boolean;
  }

  interface UriOptions {
    uri: string;
  }
  interface UrlOptions {
    url: string;
  }
  export type RequiredUriUrl = UriOptions | UrlOptions;

  interface OptionalUriUrl {
    uri?: string;
    url?: string;
  }

      export type OptionsWithUri = UriOptions & CoreOptions;
      export type OptionsWithUrl = UrlOptions & CoreOptions;
      export type Options = OptionsWithUri | OptionsWithUrl;

  export interface RequestCallback {
    (error: any, response: IncomingMessage, body: any): void;
  }

  export interface HttpArchiveRequest {
    url?: string;
    method?: string;
    headers?: NameValuePair[];
    postData?: {
      mimeType?: string;
      params?: NameValuePair[];
    };
  }

  export interface NameValuePair {
    name: string;
    value: string;
  }

  export interface Multipart {
    chunked?: boolean;
    data?: {
      'content-type'?: string,
      body: string
    }[];
  }

  export interface RequestPart {
    headers?: Headers;
    body: any;
  }

  export interface Request extends Stream {
    readable: boolean;
    writable: boolean;

    getAgent(): Agent;
    // start(): void;
    // onProblemAbort(): void;
    pipeDest(dest: any): void;
    setHeader(name: string, value: string, clobber?: boolean): Request;
    setHeaders(headers: Headers): Request;
    qs(q: Object, clobber?: boolean): Request;
    form(): FormData;
    form(form: any): Request;
    multipart(multipart: RequestPart[]): Request;
    json(val: any): Request;
    aws(opts: AWSOptions, now?: boolean): Request;
    auth(username: string, password: string, sendInmediately?: boolean, bearer?: string): Request;
    oauth(oauth: OAuthOptions): Request;
    jar(jar: CookieJar): Request;

    on(event: string, listener: Function): this;
    on(event: 'request', listener: (req: ClientRequest) => void): this;
    on(event: 'response', listener: (resp: IncomingMessage) => void): this;
    on(event: 'data', listener: (data: Buffer | string) => void): this;
    on(event: 'error', listener: (e: Error) => void): this;
    on(event: 'complete', listener: (resp: IncomingMessage, body?: string | Buffer) => void): this;

    write(buffer: Buffer, cb?: Function): boolean;
    write(str: string, cb?: Function): boolean;
    write(str: string, encoding: string, cb?: Function): boolean;
    write(str: string, encoding?: string, fd?: string): boolean;
    end(): void;
    end(chunk: Buffer, cb?: Function): void;
    end(chunk: string, cb?: Function): void;
    end(chunk: string, encoding: string, cb?: Function): void;
    pause(): void;
    resume(): void;
    abort(): void;
    destroy(): void;
    toJSON(): Object;
  }

  export interface Headers {
    [key: string]: any;
  }

  export interface AuthOptions {
    user?: string;
    username?: string;
    pass?: string;
    password?: string;
    sendImmediately?: boolean;
    bearer?: string;
  }

  export interface OAuthOptions {
    callback?: string;
    consumer_key?: string;
    consumer_secret?: string;
    token?: string;
    token_secret?: string;
    verifier?: string;
  }

  export interface HawkOptions {
    credentials: any;
  }

  export interface AWSOptions {
    secret: string;
    bucket?: string;
  }

  /**
   * Cookies
   */
  // Request wraps the `tough-cookies`'s CookieJar in a synchronous RequestJar
  // https://github.com/request/request/blob/master/lib/cookies.js
  export type Cookie = toughCookie.Cookie;
  export type CookieStore = toughCookie.Store;
  export type SetCookieOptions = toughCookie.SetCookieOptions;

  export interface CookieJar {
    // RequestJar.prototype.setCookie = function(cookieOrStr, uri, options) {
    //   var self = this
    //   return self._jar.setCookieSync(cookieOrStr, uri, options || {})
    // }
    setCookie(cookieOrString: Cookie | string, uri: string, options?: SetCookieOptions): Cookie;

    // RequestJar.prototype.getCookieString = function(uri) {
    //   var self = this
    //   return self._jar.getCookieStringSync(uri)
    // }
    getCookieString(uri: string): string;

    // RequestJar.prototype.getCookies = function(uri) {
    //   var self = this
    //   return self._jar.getCookiesSync(uri)
    // }
    getCookies(uri: string): Cookie[];
  }
}

export = request;
}
declare module 'request/index' {
import alias = require('~request/index');
export = alias;
}
declare module 'request' {
import alias = require('~request/index');
export = alias;
}
