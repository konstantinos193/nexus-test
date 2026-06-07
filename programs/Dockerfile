# Solana/Anchor build image for nexus-launchpad
FROM rust:1.86-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    pkg-config \
    libssl-dev \
    libudev-dev \
    git \
    bzip2 \
    && rm -rf /var/lib/apt/lists/*

# Solana CLI via GitHub release tarball (more reliable than install.sh behind flaky TLS)
ARG SOLANA_VERSION=1.18.26
RUN set -eux; \
    curl -fsSL --retry 5 --retry-delay 3 \
      "https://github.com/solana-labs/solana/releases/download/v${SOLANA_VERSION}/solana-release-x86_64-unknown-linux-gnu.tar.bz2" \
      -o /tmp/solana.tar.bz2; \
    mkdir -p /opt/solana; \
    tar -xjf /tmp/solana.tar.bz2 -C /opt/solana --strip-components=1; \
    rm /tmp/solana.tar.bz2

ENV PATH="/usr/local/cargo/bin:/opt/solana/bin:${PATH}"

RUN solana --version && cargo-build-sbf --version

# Anchor CLI 0.32.1 (must match Anchor.toml)
RUN cargo install --locked anchor-cli@0.32.1

RUN anchor --version

WORKDIR /workspace