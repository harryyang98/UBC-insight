/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import {IInsightFacade, NotFoundError} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private facade: IInsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
        this.facade = new InsightFacade();
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC"
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);
                that.rest.put("/dataset/:id/:kind", that.putDataset.bind(that));
                that.rest.del("/dataset/:id", that.deleteDataset.bind(that));
                that.rest.post("/query", that.postQuery.bind(that));
                that.rest.get("/datasets", that.getDatasets.bind(that));

                // NOTE: your endpoints should go here

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private async putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::put dataset");
        await this.facade.addDataset(req.params.id, req.body.toString("base64"), req.params.kind).then((ids) => {
            res.json(200, { result: ids });
        }).catch((err) => {
            Log.error("Server::" + err);
            res.json(400, { error: err.toString() });
        });
        return next();
    }

    private async deleteDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::delete dataset");
        await this.facade.removeDataset(req.params.id).then((id) => {
            res.json(200, { result: id});
        }).catch((err) => {
            Log.error("Server::" + err);
            if (err instanceof NotFoundError) {
                res.json(404, { error: err.toString() });
            } else {
                res.json(400, { error: err.toString() });
            }
        });
        return next();
    }

    private async postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::query dataset");
        await this.facade.performQuery(req.body).then((results) => {
            res.json(200, { result: results });
        }).catch((err) => {
            Log.error("Server::" + err);
            res.json(400, { error: err.toString() });
        });
        return next();
    }

    private async getDatasets(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::get datasets");
        await this.facade.listDatasets().then((sets) => {
            res.json(200, { result: sets });
        });
        return next();
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
