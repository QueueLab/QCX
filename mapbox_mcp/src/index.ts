/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-20 09:34:01
 * @Description: Mapbox MCP server
 */
import { MapboxServer } from "./server/main";

async function runServer() {
  const server = new MapboxServer();
  await server.start();
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
// #endregion
