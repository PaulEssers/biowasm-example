use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

/// GC content result for a single FASTA sequence.
/// Deserialize is derived only so that unit tests can round-trip through JSON.
#[derive(Serialize, Deserialize)]
struct GcResult {
    name: String,
    length: usize,
    gc_count: usize,
    gc_content: f64,
}

/// Parse a FASTA string and return a JSON array of GC content results,
/// one object per sequence.  Sequences may span multiple lines.
#[wasm_bindgen]
pub fn calculate_gc_content(fasta: &str) -> String {
    let mut results = Vec::new();
    let mut current_name = String::new();
    let mut current_seq = String::new();

    for line in fasta.lines() {
        let line = line.trim();
        if let Some(header) = line.strip_prefix('>') {
            if !current_name.is_empty() {
                results.push(gc_for_sequence(&current_name, &current_seq));
                current_seq.clear();
            }
            current_name = header.trim().to_string();
        } else if !line.is_empty() {
            current_seq.push_str(line);
        }
    }

    // Process the final sequence (no trailing '>' to trigger the flush above)
    if !current_name.is_empty() {
        results.push(gc_for_sequence(&current_name, &current_seq));
    }

    serde_json::to_string(&results).unwrap()
}

fn gc_for_sequence(name: &str, sequence: &str) -> GcResult {
    let length = sequence.len();
    let gc_count = sequence
        .chars()
        .filter(|c| matches!(c.to_ascii_uppercase(), 'G' | 'C'))
        .count();

    GcResult {
        name: name.to_string(),
        length,
        gc_count,
        gc_content: if length > 0 {
            gc_count as f64 / length as f64
        } else {
            0.0
        },
    }
}

// ---------------------------------------------------------------------------
// Unit tests  —  run with:  cargo test  (from tools/gc_calculator/)
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    fn parse(fasta: &str) -> Vec<GcResult> {
        serde_json::from_str(&calculate_gc_content(fasta)).unwrap()
    }

    #[test]
    fn test_all_gc() {
        let results = parse(">s\nGCGCGCGC\n");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].length, 8);
        assert_eq!(results[0].gc_count, 8);
        assert_eq!(results[0].gc_content, 1.0);
    }

    #[test]
    fn test_no_gc() {
        let results = parse(">s\nATATATAT\n");
        assert_eq!(results[0].gc_content, 0.0);
        assert_eq!(results[0].gc_count, 0);
    }

    #[test]
    fn test_multiline_sequence() {
        let results = parse(">s\nATGC\nATGC\n");
        assert_eq!(results[0].length, 8);
        assert_eq!(results[0].gc_count, 4);
        assert_eq!(results[0].gc_content, 0.5);
    }

    #[test]
    fn test_multiple_sequences() {
        let fasta = ">s1\nGGGG\n>s2\nAAAA\n";
        let results = parse(fasta);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].name, "s1");
        assert_eq!(results[0].gc_content, 1.0);
        assert_eq!(results[1].name, "s2");
        assert_eq!(results[1].gc_content, 0.0);
    }

    #[test]
    fn test_empty_input() {
        assert!(parse("").is_empty());
    }

    #[test]
    fn test_case_insensitive() {
        let results = parse(">s\ngcGC\n");
        assert_eq!(results[0].gc_content, 1.0);
    }

    #[test]
    fn test_single_base() {
        let results = parse(">s\nA\n");
        assert_eq!(results[0].length, 1);
        assert_eq!(results[0].gc_content, 0.0);
    }
}
