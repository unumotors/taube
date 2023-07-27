declare module "config/index" {
    namespace _default {
        namespace http {
            let port: string | number;
            let limit: string;
            let exposePrometheusMetrics: boolean;
        }
        namespace got {
            let retries: number;
        }
        let testing: boolean;
        namespace amqp {
            let initialConnectionTimeout: number;
        }
    }
    export default _default;
}
declare module "http" {
    namespace _default {
        export { server };
        export { getPort };
        export { init };
        export { app };
        export { ensureErrorHandlingMiddlewareIsLast };
        export { shutdown };
    }
    export default _default;
    const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
    function getPort(): any;
    function init(): Promise<any>;
    const app: any;
    function ensureErrorHandlingMiddlewareIsLast(): void;
    function shutdown(): Promise<any>;
    import http from "http";
}
declare module "helpers/converter" {
    export function escape(value: any): string;
    export default escape;
}
declare module "components/requester" {
    export default Requester;
    /**
     * @deprecated
     */
    class Requester {
        constructor(options: any, configOverwrites?: {});
        config: {
            http: {
                port: string | number;
                limit: string;
                exposePrometheusMetrics: boolean;
            };
            got: {
                retries: number;
            };
            testing: boolean;
            amqp: {
                initialConnectionTimeout: number;
            };
        };
        key: any;
        port: any;
        uri: any;
        userAgent: string;
        sendWithOptions(payload: any, options: any, callback: any): Promise<any>;
        send(payload: any, callback: any): Promise<any>;
    }
}
declare module "components/errors" {
    export function convertToTaubeError(error: Error): any;
    export default errors;
    const errors: {};
}
declare module "components/responder" {
    export default Responder;
    /**
     * @deprecated
     */
    class Responder {
        constructor(options: any);
        key: any;
        sockendWhitelist: any;
        on(type: any, fn: any): void;
    }
}
declare module "helpers/monitoring" {
    export function readinessCheck(): void;
    namespace _default {
        export { readinessCheck };
    }
    export default _default;
}
declare module "components/sockend" {
    export default Sockend;
    /**
     * @deprecated
     */
    class Sockend {
        constructor(io: any);
        io: any;
        id: string;
        namespaces: {};
        requesterTransformators: any[];
        addNamespace(options: any): Promise<Namespace>;
        getNamespace(name: any): any;
        isReady(): any;
    }
    class Namespace {
        constructor(options: any, sockend: any);
        sockend: any;
        namespace: any;
        requester: Requester;
        fullRequesterURI: string;
        additionalOn: any[];
        socketNamespace: any;
        socketMiddlewareFns: any[];
        allowTopic(topic: any): void;
        namespaceUse(fn: any): void;
        socketUse(fn: any): void;
        init(): this;
    }
    import Requester from "components/requester";
}
declare module "amqp" {
    namespace _default {
        export { amqp };
        export { connection };
        export { shutdown };
        export { shutdownChannel };
        export { channel };
        export { getChannels };
        export { getErrorHandler };
        export { connections as _connections };
    }
    export default _default;
    import amqp from "amqp-connection-manager";
    function connection(uri: any, options?: {}): Promise<any>;
    function shutdown(): Promise<void>;
    function shutdownChannel(channelInstance: any): Promise<void>;
    function channel(options: any): Promise<any>;
    function getChannels(): any[];
    function getErrorHandler(): typeof defaultErrorHandler;
    const connections: {};
    function defaultErrorHandler(error: any): void;
}
declare module "components/publisher" {
    export default Publisher;
    /**
     * @deprecated
     */
    class Publisher {
        constructor(options: any);
        options: any;
        key: any;
        keyEscaped: string;
        amqp: {
            amqp: {
                connect: typeof import("amqp-connection-manager").connect;
            };
            connection: (uri: any, options?: {}) => Promise<any>;
            shutdown: () => Promise<void>;
            shutdownChannel: (channelInstance: any) => Promise<void>;
            channel: (options: any) => Promise<any>;
            getChannels: () => any[];
            getErrorHandler: () => (error: any) => void;
            _connections: {};
        };
        publish(topic: any, data: any): Promise<any>;
        channel: any;
    }
}
declare module "components/subscriber" {
    export default Subscriber;
    /**
     * @deprecated
     */
    class Subscriber {
        constructor(options: any);
        options: any;
        key: any;
        keyEscaped: string;
        fns: {};
        topics: any[];
        setupChannel(): Promise<any>;
        initializingPromise: Promise<any>;
        channel: any;
        q: any;
        consumer: any;
        on(topic: any, fn: any): Promise<void>;
    }
}
declare module "components/worker" {
    export default Worker;
    class Worker {
        constructor(options: any);
        options: any;
        key: any;
        keyEscaped: string;
        deadLetterExchange: any;
        prefetch: any;
        amqp: {
            amqp: {
                connect: typeof import("amqp-connection-manager").connect;
            };
            connection: (uri: any, options?: {}) => Promise<any>;
            shutdown: () => Promise<void>;
            shutdownChannel: (channelInstance: any) => Promise<void>;
            channel: (options: any) => Promise<any>;
            getChannels: () => any[];
            getErrorHandler: () => (error: any) => void;
            _connections: {};
        };
        consume(fn: any): Promise<any>;
        channel: any;
        consumer: any;
    }
}
declare module "components/queue" {
    export default Queue;
    class Queue {
        constructor(options: any);
        options: any;
        key: any;
        keyEscaped: string;
        deadLetterExchange: any;
        amqp: {
            amqp: {
                connect: typeof import("amqp-connection-manager").connect;
            };
            connection: (uri: any, options?: {}) => Promise<any>;
            shutdown: () => Promise<void>;
            shutdownChannel: (channelInstance: any) => Promise<void>;
            channel: (options: any) => Promise<any>;
            getChannels: () => any[];
            getErrorHandler: () => (error: any) => void;
            _connections: {};
        };
        enqueue(data: any): Promise<any>;
        channel: any;
    }
}
declare module "helpers/uri" {
    namespace _default {
        export { fixClientURI };
        export { validatePath };
    }
    export default _default;
    function fixClientURI(uri: any): any;
    function validatePath(path: any): any;
}
declare module "components/client" {
    export default Client;
    class Client {
        constructor({ uri, port }: {
            uri: any;
            port: any;
        });
        uri: any;
        port: any;
        makePath(path: any, params?: {}): string;
        get(path: any, options?: {}): Promise<string>;
        paginate(path: any, options?: {}): Promise<string>;
        post(path: any, payload: any, options?: {}): Promise<string>;
        put(path: any, payload: any, options?: {}): Promise<string>;
        delete(path: any, options?: {}): Promise<string>;
    }
}
declare module "helpers/schema" {
    export default schemas;
    namespace schemas {
        let paginationResponseSchema: Joi.ObjectSchema<any>;
        namespace paginationRequestOptionsSchema {
            let page: Joi.NumberSchema<number>;
            let limit: Joi.NumberSchema<number>;
        }
    }
    import Joi from "joi";
}
declare module "components/server" {
    export default Server;
    class Server {
        router: any;
        get(path: any, validate: any, fn: any): void;
        paginate(path: any, validate: any, fn: any): void;
        post(path: any, validate: any, fn: any): void;
        put(path: any, validate: any, fn: any): void;
        delete(path: any, validate: any, fn: any): void;
    }
    namespace Server {
        export { checkParameters };
    }
    function checkParameters(path: any, validation: any, fn: any): void;
}
declare module "components/mocking" {
    export default ClientMock;
    class ClientMock {
        constructor(client: any);
        clients: {};
        addClient(client: any): void;
        linkClientToPactProvider(clientUri: any, provider: any): void;
    }
}
declare module "components/queue-worker-exponential-retries" {
    namespace _default {
        export { Queue };
        export { Worker };
    }
    export default _default;
    class Queue extends QueueWorkerExponentialRetries {
        enqueue(data: any, headers?: {}): Promise<any>;
    }
    class Worker extends QueueWorkerExponentialRetries {
        consume(fn: any): Promise<void>;
    }
    class QueueWorkerExponentialRetries {
        constructor(queueName: any, options?: {});
        options: {
            worker: {};
        };
        name: string;
        delays: any;
        amqp: {
            amqp: {
                connect: typeof import("amqp-connection-manager").connect;
            };
            connection: (uri: any, options?: {}) => Promise<any>;
            shutdown: () => Promise<void>;
            shutdownChannel: (channelInstance: any) => Promise<void>;
            channel: (options: any) => Promise<any>;
            getChannels: () => any[];
            getErrorHandler: () => (error: any) => void;
            _connections: {};
        };
        validateOptions(): void;
        init(): Promise<void>;
        initiationPromise: Promise<void>;
        handleMessage(channel: any, message: any, fn: any): Promise<void>;
        retryMessage({ channel, message, error, payload, }: {
            channel: any;
            message: any;
            error: any;
            payload: any;
        }): Promise<void>;
        handleErrorMessage({ channel, message, payload, error, }: {
            channel: any;
            message: any;
            payload: any;
            error: any;
        }): Promise<void>;
        getRetryQueue(channel: any, delaySeconds: any): Promise<string>;
        deathCount(headers: any): any;
        handleChannelCancelled(channel: any, fn: any): Promise<void>;
        channel: any;
        createRetryExchange(channel: any): Promise<void>;
        createPrimaryExchangeAndQueue(channel: any): Promise<void>;
        createExtraKeyBindings(channel: any): Promise<void>;
        createExchange(channel: any, name: any, type: any): Promise<void>;
    }
}
declare module "helpers/mongo" {
    namespace _default {
        export { shutdown };
    }
    export default _default;
    /**
     * Only shutdown mongoose if it is available.
     */
    function shutdown(): Promise<void>;
}
declare module "@unu/taube" {
    export { default as Joi } from "joi";
    export { default as Requester } from "./components/requester";
    export { default as Responder } from "./components/responder";
    export { default as monitoring } from "./helpers/monitoring";
    export { default as Sockend } from "./components/sockend";
    export { default as Publisher } from "./components/publisher";
    export { default as Subscriber } from "./components/subscriber";
    export { default as Worker } from "./components/worker";
    export { default as Queue } from "./components/queue";
    export { default as Errors } from "./components/errors";
    export { default as Client } from "./components/client";
    export { default as Server } from "./components/server";
    export { default as MockClient } from "./components/mocking";
    export { default as QueueWorkerExponentialRetries } from "./components/queue-worker-exponential-retries";
    export { default as http } from "./http";
    export { default as amqp } from "./amqp";
    export function shutdown(): Promise<void>;
    export default taube;
    namespace taube {
        export { Requester };
        export { Responder };
        export { monitoring };
        export { Sockend };
        export { Publisher };
        export { Subscriber };
        export { Worker };
        export { Queue };
        export { Errors };
        export { Client };
        export { Server };
        export { MockClient };
        export { QueueWorkerExponentialRetries };
        export { http };
        export { amqp };
        export { Joi };
        export { shutdown };
    }
    import Requester from "components/requester";
    import Responder from "components/responder";
    import monitoring from "helpers/monitoring";
    import Sockend from "components/sockend";
    import Publisher from "components/publisher";
    import Subscriber from "components/subscriber";
    import Worker from "components/worker";
    import Queue from "components/queue";
    import Errors from "components/errors";
    import Client from "components/client";
    import Server from "components/server";
    import MockClient from "components/mocking";
    import QueueWorkerExponentialRetries from "components/queue-worker-exponential-retries";
    import http from "http";
    import amqp from "amqp";
    import Joi from "joi";
}
