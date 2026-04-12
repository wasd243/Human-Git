use colored::*;

pub(crate) fn log_color(label: &str, message: &str, color: &str) {
    let colored_label = match color {
        "green"  => label.green().bold(),
        "yellow" => label.yellow().bold(),
        "red"    => label.red().bold(),
        "cyan"   => label.cyan().bold(),
        "mag"    => label.magenta().bold(),
        _        => label.white().bold(), // white as default
    };

    println!("{} {}", colored_label, message.bright_white());
}