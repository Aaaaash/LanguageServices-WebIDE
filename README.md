# LanguageServer

## RUN java jdt.ls
```bash
CLIENT_PORT=13245 java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=1045,quiet=y -Declipse.application=org.eclipse.jdt.ls.core.id1 -Dosgi.bundles.defaultStartLevel=4 -Declipse.product=org.eclipse.jdt.ls.core.product -Dlog.level=ALL -jar /Users/sakura/lsp/vscode-java/server/plugins/org.eclipse.equinox.launcher_1.5.0.v20180207-1446.jar -configuration /Users/sakura/lsp/vscode-java/server/config_mac -data /Users/sakura/Documents/java/spring-boot-start
```
## RUN nodejs

```bash
ts-node server.ts
```