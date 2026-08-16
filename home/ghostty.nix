{ pkgs, lib, ... }:
let
  palette = import ./palette.nix;

  theme = c: ''
    palette = 0=${c.ansi_black}
    palette = 1=${c.red}
    palette = 2=${c.green}
    palette = 3=${c.yellow}
    palette = 4=${c.blue}
    palette = 5=${c.purple}
    palette = 6=${c.cyan}
    palette = 7=${c.ansi_white}
    palette = 8=${c.ansi_bright_black}
    palette = 9=${c.bright_red}
    palette = 10=${c.bright_green}
    palette = 11=${c.bright_yellow}
    palette = 12=${c.bright_blue}
    palette = 13=${c.bright_purple}
    palette = 14=${c.bright_cyan}
    palette = 15=${c.ansi_bright_white}
    background = ${c.bg}
    foreground = ${c.fg}
    cursor-color = ${c.purple}
    selection-background = ${c.selection}
    selection-foreground = ${c.fg}
  '';
in
{
  xdg.configFile."ghostty/config".text = ''
    window-padding-balance = true
    mouse-hide-while-typing = true
    quit-after-last-window-closed = true
    confirm-close-surface = false
    selection-clear-on-copy = true
    shell-integration = none

    ${lib.optionalString pkgs.stdenv.hostPlatform.isDarwin ''
      macos-icon = glass
      macos-titlebar-style = hidden
      macos-option-as-alt = true
    ''}
    theme = dark:onedarkpro_onedark,light:onedarkpro_onelight
    adjust-cell-height = 24%

    font-family = Maple Mono NF CN
    font-size = 14
    font-feature = calt
    font-feature = ss11
  '';

  xdg.configFile."ghostty/themes/onedarkpro_onedark".text = theme palette.dark;
  xdg.configFile."ghostty/themes/onedarkpro_onelight".text = theme palette.light;
}
