#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSessionTools } from "./tools/session.js";
import { registerContextTools } from "./tools/context.js";
import { registerWorkOrderTools } from "./tools/work-orders.js";
import { registerLintTool } from "./tools/lint.js";
import { registerScaffoldTool } from "./tools/scaffold.js";

const server = new McpServer({
  name: "praxis",
  version: "1.0.0",
});

// Register all tool categories
registerSessionTools(server);
registerContextTools(server);
registerWorkOrderTools(server);
registerLintTool(server);
registerScaffoldTool(server);

// Start the server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
