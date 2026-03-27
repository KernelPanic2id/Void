FROM rust:1.86-slim AS builder
WORKDIR /app

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY packages/signaling-server packages/signaling-server

# Create dummy crates for other workspace members so cargo doesn't complain
RUN mkdir -p apps/desktop/src-tauri/src && \
    echo "fn main() {}" > apps/desktop/src-tauri/src/main.rs && \
    echo '[package]\nname = "desktop"\nversion = "0.1.0"\nedition = "2021"\n[lib]\nname = "desktop_lib"\ncrate-type = ["rlib"]\n[dependencies]\n' > apps/desktop/src-tauri/Cargo.toml && \
    echo "pub fn dummy() {}" > apps/desktop/src-tauri/src/lib.rs && \
    mkdir -p packages/core-wasm/src && \
    echo "pub fn dummy() {}" > packages/core-wasm/src/lib.rs && \
    echo '[package]\nname = "core-wasm"\nversion = "0.1.0"\nedition = "2021"\n[dependencies]\n' > packages/core-wasm/Cargo.toml

RUN cargo build --release -p signaling-server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/signaling-server /usr/local/bin/signaling-server
EXPOSE 3001
CMD ["signaling-server"]

