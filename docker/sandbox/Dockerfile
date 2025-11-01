# Linux Sandbox Dockerfile
# Isolated, minimal Linux environment for terminal exercises
FROM ubuntu:22.04

# Install essential Linux tools for exercises
RUN apt-get update && apt-get install -y \
    bash \
    coreutils \
    grep \
    sed \
    gawk \
    vim \
    nano \
    curl \
    wget \
    git \
    net-tools \
    iputils-ping \
    procps \
    sudo \
    man-db \
    tree \
    htop \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for exercises
RUN useradd -m -s /bin/bash student && \
    echo "student ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up home directory with practice files
WORKDIR /home/student
RUN chown -R student:student /home/student

# Switch to student user
USER student

# Set environment
ENV HOME=/home/student
ENV TERM=xterm-256color

# Create initial directory structure for exercises
RUN mkdir -p ~/documents ~/downloads ~/projects

# Keep container running
CMD ["/bin/bash"]
