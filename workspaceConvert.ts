const basePath = '/data/coding-ide-home/workspace';
const localBasePath = '/Users/sakura/lsp';

const CRLF = '\r\n';
const ContentLength: string = 'Content-Length: ';

function insert(str, flg, sn) {
  const start = str.substr(0, sn);
  const end = str.substr(sn, str.length);
  const newstr = start + flg + end;
  return newstr;
}

export default function workspaceConvert(msg: String) {
  const reg = /^Content-Length:\s\d+/;
  const matched = msg.match(reg);
  const header = Array.isArray(matched) ? matched[0] : '';
  if (header === '') return msg;
  const content = JSON.parse(msg.substr(header.length, msg.length));
  if (content.method === 'initialize') {
    const baseUri = content.params.rootUri.substr(
      7,
      content.params.rootUri.length,
    );
    const newContent = JSON.stringify({
      ...content,
      params: { ...content.params, rootUri: `${localBasePath}${baseUri}` },
    });
    const result = [
      ContentLength,
      newContent.length.toString(),
      CRLF,
      CRLF,
      newContent,
    ].join('');
    return result;
  } else if (content.method && content.params.textDocument) {
    console.log(insert(content.params.textDocument.uri, localBasePath, 7), '\n');
    const newContent = JSON.stringify({
      ...content,
      params: { ...content.params, textDocument: { ...content.params.textDocument, uri: insert(content.params.textDocument.uri, localBasePath, 7) } },
    });
    const result = [
      ContentLength,
      newContent.length.toString(),
      CRLF,
      CRLF,
      newContent,
    ].join('');
    return result;
  } else {
    return msg;
  }
}
