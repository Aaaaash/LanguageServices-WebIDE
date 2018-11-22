/* tslint:disable */
export default [
  {
    description: "OmniSharp for Windows (.NET 4.6 / x86)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/515dbb33-d644-4ba6-9ee4-8ca7227ab580/02621f196a581cb3062dbeab2ec28429/omnisharp-win-x86-1.32.8.zip",
    fallbackUrl:
      "https://omnisharpdownload.blob.core.windows.net/ext/omnisharp-win-x86-1.32.8.zip",
    installPath: ".omnisharp/1.32.8",
    platforms: ["win32"],
    architectures: ["x86"],
    installTestPath: "./.omnisharp/1.32.8/OmniSharp.exe",
    platformId: "win-x86"
  },
  {
    description: "OmniSharp for Windows (.NET 4.6 / x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/515dbb33-d644-4ba6-9ee4-8ca7227ab580/bdfde5788994e381c9a3efe5777081bd/omnisharp-win-x64-1.32.8.zip",
    fallbackUrl:
      "https://omnisharpdownload.blob.core.windows.net/ext/omnisharp-win-x64-1.32.8.zip",
    installPath: ".omnisharp/1.32.8",
    platforms: ["win32"],
    architectures: ["x86_64"],
    installTestPath: "./.omnisharp/1.32.8/OmniSharp.exe",
    platformId: "win-x64"
  },
  {
    description: "OmniSharp for OSX",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/515dbb33-d644-4ba6-9ee4-8ca7227ab580/dcead54f3e2dcc736d0ca1cbfde2ad0c/omnisharp-osx-1.32.8.zip",
    fallbackUrl:
      "https://omnisharpdownload.blob.core.windows.net/ext/omnisharp-osx-1.32.8.zip",
    installPath: ".omnisharp/1.32.8",
    platforms: ["darwin"],
    binaries: ["./mono.osx", "./run"],
    installTestPath: "./.omnisharp/1.32.8/run",
    platformId: "osx"
  },
  {
    description: "OmniSharp for Linux (x86)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/515dbb33-d644-4ba6-9ee4-8ca7227ab580/ac9dde43e4905a8481c35f557fe09502/omnisharp-linux-x86-1.32.8.zip",
    fallbackUrl:
      "https://omnisharpdownload.blob.core.windows.net/ext/omnisharp-linux-x86-1.32.8.zip",
    installPath: ".omnisharp/1.32.8",
    platforms: ["linux"],
    architectures: ["x86", "i686"],
    binaries: ["./mono.linux-x86", "./run"],
    installTestPath: "./.omnisharp/1.32.8/run",
    platformId: "linux-x86"
  },
  {
    description: "OmniSharp for Linux (x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/515dbb33-d644-4ba6-9ee4-8ca7227ab580/ee3801c7083438b5e54fa7405662565a/omnisharp-linux-x64-1.32.8.zip",
    fallbackUrl:
      "https://omnisharpdownload.blob.core.windows.net/ext/omnisharp-linux-x64-1.32.8.zip",
    installPath: ".omnisharp/1.32.8",
    platforms: ["linux"],
    architectures: ["x86_64"],
    binaries: ["./mono.linux-x86_64", "./run"],
    installTestPath: "./.omnisharp/1.32.8/run",
    platformId: "linux-x64"
  },
  {
    description: ".NET Core Debugger (Windows / x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/90e2038c-960d-4018-924e-30f520f887ab/117523c7024fbf6ffef530b707d7253a/coreclr-debug-win7-x64.zip",
    fallbackUrl:
      "https://vsdebugger.blob.core.windows.net/coreclr-debug-1-17-1/coreclr-debug-win7-x64.zip",
    installPath: ".debugger",
    platforms: ["win32"],
    architectures: ["x86_64"],
    installTestPath: "./.debugger/vsdbg-ui.exe"
  },
  {
    description: ".NET Core Debugger (macOS / x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/90e2038c-960d-4018-924e-30f520f887ab/2d53db027d1e67b899a7f083800b2bd4/coreclr-debug-osx-x64.zip",
    fallbackUrl:
      "https://vsdebugger.blob.core.windows.net/coreclr-debug-1-17-1/coreclr-debug-osx-x64.zip",
    installPath: ".debugger",
    platforms: ["darwin"],
    architectures: ["x86_64"],
    binaries: ["./vsdbg-ui", "./vsdbg"],
    installTestPath: "./.debugger/vsdbg-ui"
  },
  {
    description: ".NET Core Debugger (linux / x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/90e2038c-960d-4018-924e-30f520f887ab/090d7ebd63a3d44b31cb23568b53833d/coreclr-debug-linux-x64.zip",
    fallbackUrl:
      "https://vsdebugger.blob.core.windows.net/coreclr-debug-1-17-1/coreclr-debug-linux-x64.zip",
    installPath: ".debugger",
    platforms: ["linux"],
    architectures: ["x86_64"],
    binaries: ["./vsdbg-ui", "./vsdbg"],
    installTestPath: "./.debugger/vsdbg-ui"
  },
  {
    description: "Razor Language Server (Windows / x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/3b0ae709-c067-48b4-a658-549ca972e437/bbd021dbeab477395f37f1c4e39c31ad/razorlanguageserver-win-x64-1.0.0-alpha2-20181112.3.zip",
    installPath: ".razor",
    platforms: ["win32"],
    architectures: ["x86_64"]
  },
  {
    description: "Razor Language Server (Windows / x86)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/3b0ae709-c067-48b4-a658-549ca972e437/d4196db447b32b655910532321f4bd6a/razorlanguageserver-win-x86-1.0.0-alpha2-20181112.3.zip",
    installPath: ".razor",
    platforms: ["win32"],
    architectures: ["x86"]
  },
  {
    description: "Razor Language Server (Linux / x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/3b0ae709-c067-48b4-a658-549ca972e437/ad6d340d6d68e760bb1bb7a8073051f3/razorlanguageserver-linux-x64-1.0.0-alpha2-20181112.3.zip",
    installPath: ".razor",
    platforms: ["linux"],
    architectures: ["x86_64"],
    binaries: ["./rzls"]
  },
  {
    description: "Razor Language Server (macOS / x64)",
    url:
      "https://download.visualstudio.microsoft.com/download/pr/3b0ae709-c067-48b4-a658-549ca972e437/e4808fd370ba60d528944a5a36543cf0/razorlanguageserver-osx-x64-1.0.0-alpha2-20181112.3.zip",
    installPath: ".razor",
    platforms: ["darwin"],
    architectures: ["x86_64"],
    binaries: ["./rzls"]
  }
];
