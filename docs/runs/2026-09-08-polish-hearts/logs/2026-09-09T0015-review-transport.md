# Review transport correction

The outer custom macOS sandbox prevented Codex from creating its nested native sandbox, so that attempted review returned no confidence and was not accepted. Native permission probes then verified live-project reads are denied, but temporary source-copy file creation remained possible. Root mounted the exact manifest-verified source export as a read-only disk image, preserving source immutability at the filesystem level, and uses an isolated native permission profile with plugins, connectors, user configuration and session persistence disabled. No user configuration or credential was changed.

The profile approach follows the official permission documentation at https://developers.openai.com/codex/permissions. The exported file hashes remain unchanged. Final review will use the current cumulative payload after the new heart-position follow-up lands.
