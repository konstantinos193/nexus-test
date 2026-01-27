# Dockerfile for Solana/Anchor Development (Localnet)
FROM ubuntu:22.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Solana CLI (for localnet validator)
# Try multiple methods to handle SSL issues
RUN (curl -sSfL https://release.solana.com/stable/install | sh) || \
    (sleep 5 && curl -sSfL https://release.solana.com/stable/install | sh) || \
    (curl -k -sSfL https://release.solana.com/stable/install | sh) || \
    (cd /tmp && \
     wget -q https://github.com/solana-labs/solana/releases/download/v1.18.0/solana-release-x86_64-unknown-linux-gnu.tar.bz2 && \
     tar jxf solana-release-x86_64-unknown-linux-gnu.tar.bz2 && \
     mkdir -p /root/.local/share/solana/install/active_release/bin && \
     cp solana-release/bin/* /root/.local/share/solana/install/active_release/bin/ && \
     rm -rf solana-release*)
# Set PATH for Solana
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"
# Verify Solana installation
RUN /root/.local/share/solana/install/active_release/bin/solana --version || \
    (echo "ERROR: Solana installation failed" && exit 1)

# Install Anchor AVM (we'll install anchor versions as needed)
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Node.js (for tests)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Yarn
RUN npm install -g yarn

# Set working directory
WORKDIR /workspace

# Default command (can be overridden)
CMD ["/bin/bash"]
