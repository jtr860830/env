status is-interactive; or return

function __apply_theme --on-variable fish_terminal_color_theme
    if test "$fish_terminal_color_theme" = light
        set -g fish_color_normal 383a42
        set -g fish_color_command 0184bc
        set -g fish_color_keyword a626a4
        set -g fish_color_quote 50a14f
        set -g fish_color_redirection 0184bc
        set -g fish_color_end 383a42
        set -g fish_color_option c18401
        set -g fish_color_error e45649
        set -g fish_color_param 4078f2
        set -g fish_color_comment 9b9fa6
        set -g fish_color_selection --background=e9e9e9
        set -g fish_color_search_match --background=e9e9e9
        set -g fish_color_operator 0184bc
        set -g fish_color_escape 0184bc
        set -g fish_color_autosuggestion a0a1a7
        set -g fish_color_cwd 4078f2
        set -g fish_color_user a626a4
        set -g fish_color_host 986801
        set -g fish_color_valid_path 50a14f
        set -g fish_color_prefix 4078f2
        set -g fish_color_history_current c18401

        set -g fish_pager_color_progress 9b9fa6
        set -g fish_pager_color_prefix 0184bc
        set -g fish_pager_color_completion 383a42
        set -g fish_pager_color_description 9b9fa6
        set -g fish_pager_color_selected_background --background=e9e9e9

        set -g pure_color_primary (set_color 4078f2)
        set -g pure_color_success (set_color 50a14f)
        set -g pure_color_danger (set_color e45649)
        set -g pure_color_warning (set_color c18401)
        set -g pure_color_info (set_color 0184bc)
        set -g pure_color_mute (set_color 9b9fa6)
        set -g pure_color_normal (set_color 383a42)
        set -g pure_color_git_branch (set_color 0184bc)
        set -g pure_color_git_dirty (set_color c18401)

        set -gx LS_COLORS "di=38;2;64;120;242:ln=38;2;1;132;188:or=38;2;228;86;73:ex=38;2;80;161;79"
        set -gx EZA_COLORS "di=38;2;64;120;242:ln=38;2;1;132;188:lp=2;38;2;1;132;188:ex=38;2;80;161;79:or=38;2;228;86;73:da=38;2;160;161;167:sn=38;2;152;104;1:sb=38;2;160;161;167:hd=1;38;2;56;58;66:ur=38;2;193;132;1:uw=38;2;228;86;73:ux=38;2;80;161;79:gr=2;38;2;193;132;1:gw=2;38;2;228;86;73:gx=2;38;2;80;161;79:tr=2;38;2;193;132;1:tw=2;38;2;228;86;73:tx=2;38;2;80;161;79:ga=38;2;80;161;79:gm=38;2;193;132;1:gd=38;2;228;86;73:gv=38;2;1;132;188:gt=38;2;166;38;164:gi=38;2;160;161;167"

    else
        set -g fish_color_normal abb2bf
        set -g fish_color_command 56b6c2
        set -g fish_color_keyword c678dd
        set -g fish_color_quote 98c379
        set -g fish_color_redirection 56b6c2
        set -g fish_color_end abb2bf
        set -g fish_color_option e5c07b
        set -g fish_color_error e06c75
        set -g fish_color_param 61afef
        set -g fish_color_comment 7f848e
        set -g fish_color_selection --background=414858
        set -g fish_color_search_match --background=414858
        set -g fish_color_operator 56b6c2
        set -g fish_color_escape 56b6c2
        set -g fish_color_autosuggestion 5c6370
        set -g fish_color_cwd 61afef
        set -g fish_color_user c678dd
        set -g fish_color_host d19a66
        set -g fish_color_valid_path 98c379
        set -g fish_color_prefix 61afef
        set -g fish_color_history_current e5c07b

        set -g fish_pager_color_progress 7f848e
        set -g fish_pager_color_prefix 56b6c2
        set -g fish_pager_color_completion abb2bf
        set -g fish_pager_color_description 7f848e
        set -g fish_pager_color_selected_background --background=414858

        set -g pure_color_primary (set_color 61afef)
        set -g pure_color_success (set_color 98c379)
        set -g pure_color_danger (set_color e06c75)
        set -g pure_color_warning (set_color e5c07b)
        set -g pure_color_info (set_color 56b6c2)
        set -g pure_color_mute (set_color 7f848e)
        set -g pure_color_normal (set_color abb2bf)
        set -g pure_color_git_branch (set_color 56b6c2)
        set -g pure_color_git_dirty (set_color e5c07b)

        set -gx LS_COLORS "di=38;2;97;175;239:ln=38;2;86;182;194:or=38;2;224;108;117:ex=38;2;152;195;121"
        set -gx EZA_COLORS "di=38;2;97;175;239:ln=38;2;86;182;194:lp=2;38;2;86;182;194:ex=38;2;152;195;121:or=38;2;224;108;117:da=38;2;92;99;112:sn=38;2;209;154;102:sb=38;2;92;99;112:hd=1;38;2;171;178;191:ur=38;2;229;192;123:uw=38;2;224;108;117:ux=38;2;152;195;121:gr=2;38;2;229;192;123:gw=2;38;2;224;108;117:gx=2;38;2;152;195;121:tr=2;38;2;229;192;123:tw=2;38;2;224;108;117:tx=2;38;2;152;195;121:ga=38;2;152;195;121:gm=38;2;229;192;123:gd=38;2;224;108;117:gv=38;2;86;182;194:gt=38;2;198;120;221:gi=38;2;92;99;112"

    end
end
__apply_theme
