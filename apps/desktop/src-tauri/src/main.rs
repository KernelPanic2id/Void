// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    desktop_lib::run();
    // If you want to register Bento events here, do it after app launch in run()
    // Example: register_bento_events(app, state)
}
