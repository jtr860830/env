{ pkgs, ... }: {
  programs.git = {
    enable = true;

    signing = {
      key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMeXnA4jq76uzsTYRaIjeXkKM0pk5ARHLrzRbYeczax/";
      signByDefault = true;
    };

    ignores = [
      ".DS_Store"
      "**/.claude/settings.local.json"
    ];

    settings = {
      user = {
        name = "Josh Hsieh";
        email = "josh.hsieh@linux.com";
      };
      alias = {
        lg = "log --color --graph --all --pretty=tformat:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit";
      };
      init.defaultBranch = "main";
      pull.rebase = true;
      fetch.prune = true;
      push.autoSetupRemote = true;
      merge.conflictstyle = "zdiff3";
      core.editor = "nvim";
      commit.verbose = true;
      rerere.enabled = true;
      branch.sort = "-committerdate";
      tag.sort = "version:refname";
      diff = {
        algorithm = "histogram";
        colorMoved = "zebra";
        colorMovedWS = "allow-indentation-change";
        mnemonicPrefix = true;
      };
      rebase = {
        autosquash = true;
        autostash = true;
        updateRefs = true;
      };
      gpg.format = "ssh";
      "gpg \"ssh\"".program =
        if pkgs.stdenv.isDarwin then
          "/Applications/1Password.app/Contents/MacOS/op-ssh-sign"
        else
          "/opt/1Password/op-ssh-sign";
    };
  };
}
