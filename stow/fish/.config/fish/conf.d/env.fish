set -gx XDG_BIN_HOME $HOME/.local/bin
set -gx XDG_CACHE_HOME $HOME/.cache
set -gx XDG_CONFIG_HOME $HOME/.config
set -gx XDG_DATA_HOME $HOME/.local/share
set -gx XDG_STATE_HOME $HOME/.local/state

set -gx PATH \
    $HOME/.local/bin \
    /opt/homebrew/bin \
    /opt/homebrew/sbin \
    /usr/local/bin \
    /usr/local/sbin \
    /usr/bin \
    /usr/sbin \
    /bin \
    /sbin

set -gx LANG en_US.UTF-8
set -gx EDITOR nvim
set -gx VISUAL nvim
set -gx MANPAGER 'nvim +Man!'
set -gx TERMINFO_DIRS /opt/homebrew/opt/ncurses/share/terminfo

set -gx CARGO_HOME $XDG_DATA_HOME/cargo
set -gx CARGO_INSTALL_ROOT $HOME/.local
set -gx CLAUDE_CONFIG_DIR $XDG_CONFIG_HOME/claude
set -gx CODEX_HOME $XDG_CONFIG_HOME/codex
set -gx COREPACK_HOME $XDG_DATA_HOME/corepack
set -gx GOBIN $HOME/.local/bin
set -gx GOPATH $XDG_DATA_HOME/go
set -gx KUBECACHEDIR $XDG_CACHE_HOME/kube
set -gx KUBECONFIG $XDG_CONFIG_HOME/kube
set -gx LIMA_HOME $XDG_DATA_HOME/lima
set -gx NODE_REPL_HISTORY $XDG_DATA_HOME/node_repl_history
set -gx NPM_CONFIG_USERCONFIG $XDG_CONFIG_HOME/npm/npmrc
set -gx REMEMBER_RUNTIME_DIR $XDG_STATE_HOME/remember/run
set -gx RUSTUP_HOME $XDG_DATA_HOME/rustup
set -gx SSH_AUTH_SOCK "$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
set -gx WGETRC $XDG_CONFIG_HOME/wgetrc
