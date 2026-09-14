from pathlib import Path

def replace_once(path_str: str, old: str, new: str):
    path = Path(path_str)
    text = path.read_text()
    if new in text:
        print(f"already patched: {path_str}")
        return
    if old not in text:
        raise SystemExit(
            f"Expected text not found in {path_str}. "
            "Stop and review the current file before applying."
        )
    path.write_text(text.replace(old, new, 1))
    print(f"patched: {path_str}")

# 1. Make Rejected a valid nominee status in existing admin actions.
replace_once(
    "lib/admin/actions.ts",
    "  'approved',\n  'published',",
    "  'approved',\n  'rejected',\n  'published',",
)

# 2. Show Rejected correctly in the Nominees edit status selector.
replace_once(
    "components/portal/awards-management-live.tsx",
    '                              <option value="approved">Approved</option>\n'
    '                              <option value="published">Published</option>',
    '                              <option value="approved">Approved</option>\n'
    '                              <option value="rejected">Rejected</option>\n'
    '                              <option value="published">Published</option>',
)

# 3. Send the live dashboard review queue to Applications rather than Nominees.
replace_once(
    "components/portal/admin-dashboard-live.tsx",
    '            <Link href="/admin/awards/nominees">\n'
    '              <FileText size={16} />\n'
    '              <span>\n'
    '                <b>{data.pendingNominees} nominees awaiting review</b>\n'
    '                <small>Awards / Nominees</small>',
    '            <Link href="/admin/awards/applications">\n'
    '              <FileText size={16} />\n'
    '              <span>\n'
    '                <b>{data.pendingNominees} applications awaiting review</b>\n'
    '                <small>Awards / Applications</small>',
)

print("Phase 12 existing-file patches complete.")
