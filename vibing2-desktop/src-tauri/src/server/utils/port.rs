// Port utilities - Find available ports for the server
use std::net::{TcpListener, SocketAddr};

/// Find an available port in the given range
pub fn find_available_port() -> Result<u16, std::io::Error> {
    find_available_port_in_range(3000, 9000)
}

/// Find an available port within a specific range
pub fn find_available_port_in_range(start: u16, end: u16) -> Result<u16, std::io::Error> {
    for port in start..=end {
        if is_port_available(port) {
            return Ok(port);
        }
    }
    Err(std::io::Error::new(
        std::io::ErrorKind::AddrInUse,
        format!("No available port found in range {}-{}", start, end),
    ))
}

/// Check if a specific port is available
pub fn is_port_available(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpListener::bind(addr).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_available_port() {
        let port = find_available_port();
        assert!(port.is_ok());
        let port = port.unwrap();
        assert!(port >= 3000 && port <= 9000);
    }

    #[test]
    fn test_is_port_available() {
        // Test with a likely available high port
        assert!(is_port_available(59999));

        // Test with a port that might be in use (but skip if it fails)
        // Port 80 might be available or not depending on the system
        let _ = is_port_available(80);
    }
}