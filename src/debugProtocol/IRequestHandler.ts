export default interface IRequestHandler {
  command: string;
  initialize: () => any;
  handle: () => any;
}
