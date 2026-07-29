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
      gpg.format = "ssh";
      "gpg \"ssh\"".program =
        if pkgs.stdenv.isDarwin then
          "/Applications/1Password.app/Contents/MacOS/op-ssh-sign"
        else
          "/opt/1Password/op-ssh-sign";
    };
  };

  programs.delta = {
    enable = true;
    enableGitIntegration = true;
    options = {
      syntax-theme = "TwoDark";
      features = "side-by-side line-numbers decorations";
      whitespace-error-style = "22 reverse";
      decorations = {
        commit-decoration-style = "bold yellow box ul";
        file-style = "bold yellow ul";
        file-decoration-style = "none";
      };
    };
  };
}
