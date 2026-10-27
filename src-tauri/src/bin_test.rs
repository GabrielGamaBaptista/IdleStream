use std::time::Duration;

#[tokio::main]
async fn main() {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .unwrap();

    let url = "https://kick.com/api/v2/channels/rodil";
    match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .send()
        .await
    {
        Ok(resp) => {
            println!("Status: {}", resp.status());
            if let Ok(text) = resp.text().await {
                println!("Body preview: {}", &text[0..std::cmp::min(200, text.len())]);
            }
        }
        Err(e) => {
            println!("Request error: {}", e);
        }
    }
}
