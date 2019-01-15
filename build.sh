#!/bin/bash

set -e

ROOT_PATH="$(cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd)"
MAVEN_CACHE_PATH="${ROOT_PATH}/cache/m2"
DEBUG_BUILD_DIR=java-debug
LSP_JAVA_DIR=lsp-java-server
LSP_PYTHON_DIR=lsp-python-server
LSP_CSHARP_DIR="lsp-csharp-server"

# In the user's container
USER=coding
USER_LSP_DIR=/home/${USER}/.lsp

build_java_runtime() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    mkdir -p downloads runtimes
    if [ ! -f "downloads/openjdk-11.0.1_linux-x64_bin.tar.gz" ]; then
        wget -P downloads/ https://download.java.net/java/GA/jdk11/13/GPL/openjdk-11.0.1_linux-x64_bin.tar.gz
    fi
    tar xf downloads/openjdk-11.0.1_linux-x64_bin.tar.gz -C runtimes/ --transform='s/jdk-11.0.1/java/'
    cd ${prevDir}
}

build_node_runtime() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    mkdir -p downloads runtimes
    if [ ! -f "downloads/node-v10.15.0-linux-x64.tar.xz" ]; then
        wget -P downloads/ https://nodejs.org/dist/v10.15.0/node-v10.15.0-linux-x64.tar.xz
    fi
    tar xf downloads/node-v10.15.0-linux-x64.tar.xz -C runtimes/ --transform='s/node-v10.15.0-linux-x64/node/'
    cd ${prevDir}
}

build_python_runtime() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    mkdir -p downloads runtimes
    if [ ! -f "downloads/Python-2.7.12.tar.xz" ]; then
        wget -P downloads/ https://www.python.org/ftp/python/2.7.12/Python-2.7.12.tar.xz
    fi
    docker run --rm \
        -w /source \
        -v ${ROOT_PATH}/downloads:/source \
        -v ${ROOT_PATH}/runtimes/python:/target \
        teeks99/gcc-ubuntu:4.9 \
        sh -c "tar xf Python-2.7.12.tar.xz \
            && cd Python-2.7.12/ \
            && ./configure  --prefix=/target \
            && make -j4 && make install \
            && chown -R $(id -u):$(id -g) /target"
    cd ${prevDir}
}

build_csharp_runtime() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    mkdir -p downloads runtimes/csharp
    if [ ! -f "downloads/omnisharp-linux-x64-1.32.8.zip" ]; then
        wget -P downloads/ https://download.visualstudio.microsoft.com/download/pr/515dbb33-d644-4ba6-9ee4-8ca7227ab580/ee3801c7083438b5e54fa7405662565a/omnisharp-linux-x64-1.32.8.zip
    fi
    unzip downloads/omnisharp-linux-x64-1.32.8.zip -d runtimes/csharp
    cd ${prevDir}
}

build_java_debug_plugin() {
    docker run --rm \
        -w /work \
        -v ${ROOT_PATH}/${DEBUG_BUILD_DIR}:/work \
        -v ${MAVEN_CACHE_PATH}:/root/.m2 \
        -v ${ROOT_PATH}/config/settings.xml:/usr/share/maven/conf/settings.xml \
        -e MAVEN_OPTS='-XX:+TieredCompilation -XX:TieredStopAtLevel=1' \
        maven:3.5.4-jdk-8-alpine \
        sh -c "mvn -T 1C clean package && chown -R $(id -u):$(id -g) ."
}

update_java_debug_code() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    if [ ! -d "${DEBUG_BUILD_DIR}" ]; then
        git submodule add https://github.com/Microsoft/java-debug.git ${DEBUG_BUILD_DIR}
        git submodule init ${DEBUG_BUILD_DIR}
    fi
    git submodule update ${DEBUG_BUILD_DIR}
    cd ${prevDir}
}

add_java_debug_plugin() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    update_java_debug_code
    build_java_debug_plugin
    JAVA_DEBUG_PLUGIN_JAR="$(ls ${ROOT_PATH}/${DEBUG_BUILD_DIR}/com.microsoft.java.debug.plugin/target/com.microsoft.java.debug.plugin-*.jar | head -n 1)"
    cp ${JAVA_DEBUG_PLUGIN_JAR} ${LSP_JAVA_DIR}/plugins
    for d in "config_linux" "config_mac"; do
        sed -i "s/^\(osgi.framework.extensions=.*$\)/&,reference\\\\:file\\\\:$(basename ${JAVA_DEBUG_PLUGIN_JAR})/g" ${LSP_JAVA_DIR}/${d}/config.ini
    done
    cd ${prevDir}
}

download_java_server() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    mkdir -p downloads runtimes
    if [ ! -f "downloads/jdt-language-server-latest.tar.gz" ]; then
        wget -P downloads/ http://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz
    fi
    mkdir -p ${LSP_JAVA_DIR}
    tar xf downloads/jdt-language-server-latest.tar.gz -C ${LSP_JAVA_DIR}
    cd ${prevDir}
}

build_java_server() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    download_java_server
    add_java_debug_plugin
    cd ${prevDir}
}

build_python_server() {
    if [ -f "${LSP_PYTHON_DIR}/lib/python2.7/orig-prefix.txt.old" ]; then
        cp -f ${LSP_PYTHON_DIR}/lib/python2.7/orig-prefix.txt.old ${LSP_PYTHON_DIR}/lib/python2.7/orig-prefix.txt
    fi
    docker run --rm \
        -w /work \
        -v ${ROOT_PATH}:/work \
        xaviercalland/docker-python-virtualenv:2.7 \
        sh -c "virtualenv ${LSP_PYTHON_DIR} --always-copy \
            && virtualenv --relocatable ${LSP_PYTHON_DIR} \
            && . ${LSP_PYTHON_DIR}/bin/activate \
            && pip install -i https://pypi.tuna.tsinghua.edu.cn/simple 'python-language-server[all]' futures \
            && deactivate \
            && virtualenv --relocatable ${LSP_PYTHON_DIR} \
            && chown -R $(id -u):$(id -g) ${LSP_PYTHON_DIR}"
    mv -f ${LSP_PYTHON_DIR}/lib/python2.7/orig-prefix.txt ${LSP_PYTHON_DIR}/lib/python2.7/orig-prefix.txt.old
    ln -s ${USER_LSP_DIR}/python-prefix.txt ${LSP_PYTHON_DIR}/lib/python2.7/orig-prefix.txt 
}

build_csharp_server() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    ### Seems that coreclr is not needed
    # mkdir -p ${LSP_CSHARP_DIR}/coreclr ${LSP_CSHARP_DIR}/razor
    # if [ ! -f "downloads/coreclr-debug-linux-x64.zip" ]; then
    #     wget -P downloads/ https://download.visualstudio.microsoft.com/download/pr/90e2038c-960d-4018-924e-30f520f887ab/090d7ebd63a3d44b31cb23568b53833d/coreclr-debug-linux-x64.zip 
    # fi
    # unzip downloads/coreclr-debug-linux-x64.zip -d ${LSP_CSHARP_DIR}/coreclr
    if [ ! -f "downloads/razorlanguageserver-linux-x64-1.0.0-alpha2-20181112.3.zip" ]; then
        wget -P downloads/ https://download.visualstudio.microsoft.com/download/pr/3b0ae709-c067-48b4-a658-549ca972e437/ad6d340d6d68e760bb1bb7a8073051f3/razorlanguageserver-linux-x64-1.0.0-alpha2-20181112.3.zip
    fi
    unzip downloads/razorlanguageserver-linux-x64-1.0.0-alpha2-20181112.3.zip -d ${LSP_CSHARP_DIR}/razor
    cd ${prevDir}
}

build_main_server() {
    docker run --rm \
        -w /work \
        -v ${ROOT_PATH}:/work \
        leftybc/node-yarn \
        sh -c "yarn  && yarn build"
}

sub_build_runtime() {
    case $1 in
        "java")
            build_java_runtime
            ;;
        "node" | "nodejs")
            build_node_runtime
            ;;
        "python")
            build_python_runtime
            ;;
        "csharp")
            build_csharp_runtime
            ;;
    esac
}

sub_build_server() {
    case $1 in
        "java")
            build_java_server
            ;;
        "python")
            build_python_server
            ;;
        "csharp")
            build_csharp_server
            ;;
        "main")
            build_main_server
            ;;
    esac
}

build_all() {
    build_node_runtime
    build_java_runtime
    build_python_runtime
    build_csharp_runtime
    build_java_server
    build_python_server
    build_csharp_server
    build_main_server
}

sub_gether_up() {
    local prevDir=`pwd`
    cd ${ROOT_PATH}
    rm -fr dist
    mkdir -p dist
    for d in ${LSP_JAVA_DIR} ${LSP_PYTHON_DIR} ${LSP_CSHARP_DIR} runtimes run.sh node_modules; do
        cp -fr ${d} dist/
    done
    cp -fr out dist/main
    cd ${prevDir}
}

PROG_NAME=$(basename $0)
sub_help() {
    echo "Usage: $PROG_NAME [-h|--help] <runtime|server> <target>"
    echo ""
    echo "Options:"
    echo "  -h:"     
    echo "  --help  This manual"
    echo "Runtimes:"
    echo "  node    Nodejs runtime"
    echo "  java    Java runtime"
    echo "  python  Python runtime"
    echo "  csharp  CSharp runtime"
    echo "Servers:"
    echo "  node    Nodejs language service"
    echo "  python  Python language service"
    echo "  csharp  CSharp language service"
    echo "  main    The main language server with JS/TS services built in"
    exit 1
}

subcommand=$1
case ${subcommand} in
    "-h" | "--help")
        sub_help
        ;;
    "runtime")
        shift
        sub_build_runtime $@
        ;;
    "server")
        shift
        sub_build_server $@
        ;;
    "")
        build_all
        ;;
esac

sub_gether_up
