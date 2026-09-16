{ config, ... }:
{
  programs.go = {
    enable = true;

    env = {
      GOPATH = "${config.xdg.dataHome}/go";
      GOBIN = "${config.xdg.dataHome}/go/bin";
    };
  };
}
