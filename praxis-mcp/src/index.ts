#!/usr/bin/env node

// CLI subcommand routing: `npx praxis-mcp init` runs CLI init,
// `npx praxis-mcp` (no args) starts the MCP server.
const subcommand = process.argv[2];

if (subcommand === "init") {
  const { runInit } = await import("./cli-init.js");
  await runInit(process.argv.slice(3));
} else if (subcommand === "--version" || subcommand === "-v") {
  console.log("praxis-mcp v1.1.1");
} else {
  // Default: start MCP server
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");

  const { registerSessionTools } = await import("./tools/session.js");
  const { registerContextTools } = await import("./tools/context.js");
  const { registerWorkOrderTools } = await import("./tools/work-orders.js");
  const { registerLintTool } = await import("./tools/lint.js");
  const { registerScaffoldTool } = await import("./tools/scaffold.js");

  const server = new McpServer({
    name: "praxis",
    version: "1.1.1",
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
}
