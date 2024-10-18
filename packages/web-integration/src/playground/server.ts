import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { join } from 'node:path';
import { ERROR_CODE_NOT_IMPLEMENTED_AS_DESIGNED } from '@/common/utils';
import { getTmpDir } from '@midscene/core/utils';
import cors from 'cors';
import express from 'express';
import { StaticPageAgent } from './agent';
import StaticPage from './static-page';

const defaultPort = 5800;
const staticPath = join(__dirname, '../../static');
let agentRequestCount = 1;

const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({
    error: err.message,
  });
};

export default class PlaygroundServer {
  app: express.Application;
  tmpDir: string;
  server?: Server;
  port?: number | null;
  constructor() {
    this.app = express();
    this.tmpDir = getTmpDir();
  }

  filePathForUuid(uuid: string) {
    return join(this.tmpDir, `${uuid}.json`);
  }

  saveContextFile(uuid: string, context: string) {
    const tmpFile = this.filePathForUuid(uuid);
    writeFileSync(tmpFile, context);
    return tmpFile;
  }

  async launch() {
    this.app.use(errorHandler);
    // Serve static files from the staticPath
    this.app.use(express.static(staticPath));

    // Serve index.html for the root route
    this.app.get('/', (req, res) => {
      res.sendFile(join(staticPath, 'index.html'));
    });

    this.app.get('/playground/status', cors(), async (req, res) => {
      res.send({
        status: 'ok',
      });
    });

    this.app.get('/context/:uuid', async (req, res) => {
      const { uuid } = req.params;
      const contextFile = this.filePathForUuid(uuid);
      assert(existsSync(contextFile), 'Context not found');

      const context = readFileSync(contextFile, 'utf8');
      res.json({
        context,
      });
    });

    // -------------------------
    // actions from report file
    this.app.post(
      '/playground-with-context',
      cors(),
      express.urlencoded({ extended: false }),
      async (req, res) => {
        const context = req.body.context;
        assert(context, 'context is required');
        const uuid = randomUUID();
        this.saveContextFile(uuid, context);
        return res.redirect(`/context/${uuid}`);
      },
    );

    this.app.post(
      '/execute',
      cors(),
      express.json({ limit: '30mb' }),
      async (req, res) => {
        const { context, type, prompt } = req.body;
        assert(context, 'context is required');
        assert(type, 'type is required');
        assert(prompt, 'prompt is required');
        const requestId = agentRequestCount++;
        console.log(`handle request: #${requestId}, ${type}, ${prompt}`);

        // build an agent with context
        const page = new StaticPage(context);
        const agent = new StaticPageAgent(page);

        const response: {
          result: any;
          dump: string | null;
          error: string | null;
        } = {
          result: null,
          dump: null,
          error: null,
        };

        try {
          if (type === 'aiQuery') {
            response.result = await agent.aiQuery(prompt);
          } else if (type === 'aiAction') {
            response.result = await agent.aiAction(prompt);
          } else if (type === 'aiAssert') {
            response.result = await agent.aiAssert(prompt, undefined, {
              keepRawResponse: true,
            });
          } else {
            response.error = `Unknown type: ${type}`;
          }
        } catch (error: any) {
          if (!error.message.includes(ERROR_CODE_NOT_IMPLEMENTED_AS_DESIGNED)) {
            response.error = error.message;
          }
        }
        try {
          response.dump = JSON.parse(agent.dumpDataString());
          agent.writeOutActionDumps();
        } catch (error: any) {
          console.error(
            `write out dump failed: #${requestId}, ${error.message}`,
          );
        }

        res.send(response);
        if (response.error) {
          console.error(
            `handle request failed: #${requestId}, ${response.error}`,
          );
        } else {
          console.log(`handle request done: #${requestId}`);
        }
      },
    );

    return new Promise((resolve, reject) => {
      const port = this.port || defaultPort;
      this.server = this.app.listen(port, () => {
        this.port = port;
        resolve(this);
      });
    });
  }

  close() {
    // close the server
    if (this.server) {
      return this.server.close();
    }
  }
}
