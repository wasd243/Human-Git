use colored::*;

pub(crate) fn log_color(label: &str, message: &str, color: &str) {
    let normalized_color = color.trim().to_ascii_lowercase();

    let colored_label = match normalized_color.as_str() {
        "green" => label.green().bold(),
        "yellow" => label.yellow().bold(),
        "red" => label.red().bold(),
        "cyan" => label.cyan().bold(),
        "mag" | "magenta" => label.magenta().bold(),
        _ => label.white().bold(),
    };

    println!("{} {}", colored_label, message.bright_white());
}
