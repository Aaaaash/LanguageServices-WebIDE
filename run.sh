#!/bin/bash
set -e

USER=coding
USER_LSP_DIR=/home/${USER}/.lsp

NODEBIN=${LSP_HOME}/runtimes/node/bin/node
PATH=${LSP_HOME}/runtimes/node/bin:${LSP_HOME}/runtimes/java/bin:${LSP_HOME}/lsp-python-server/bin:${LSP_HOME}/node_modules/.bin:$PATH

mkdir -p ${USER_LSP_DIR}

if [ ! -f "${USER_LSP_DIR}/python-prefix.txt" ]; then
    echo ${LSP_HOME}/runtimes/python > ${USER_LSP_DIR}/python-prefix.txt
fi

chown -R ${USER}:${USER} ${USER_LSP_DIR}

cd ${LSP_HOME}
sudo \
    PATH=${PATH} \
    -u coding -E -H bash -c "$NODEBIN main/main.js" > /var/log/lsp 2>&1
