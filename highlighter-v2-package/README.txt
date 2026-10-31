BIBLE BROADCAST LIVE - RESPONSIVE HIGHLIGHTER V2

WHAT CHANGED
- Uses the same 1/2/3/4-slot grid logic as output/output.html, including the 3-split pyramid (two top, third centered below).
- First-run device picker: PC/Laptop, Tablet, Smartphone. Can be changed using the Device button in the footer.
- Device choice is stored in sessionStorage (per browser tab/device; it is not broadcast to other clients).
- Responsive font fitting uses the actual verse box dimensions and re-fits on resize/orientation changes.
- Verse area, page, and viewport are non-scrollable.
- Tap toggles one word. Press-and-hold (~190ms), then drag paints or erases across subsequent words. Fast drags fill skipped word indexes.
- Uses unified Pointer Events instead of synthetic mouse events from the old touch bridge, avoiding duplicate toggles.

INSTALL
1. Stop the V2 server / close the highlighter page.
2. Extract this package.
3. Open PowerShell in the extracted package folder.
4. Run:
   Set-ExecutionPolicy -Scope Process Bypass -Force
   .\INSTALL-HIGHLIGHTER-V2.ps1 -ProjectRoot "D:\path\to\your\V2"
5. Restart the server and open highlighter.html on each target device.
6. Select the device profile on first open. Use the Device button to change it later.

BACKUP / ROLLBACK
The installer backs up the existing highlighter.html under:
  <ProjectRoot>\backups\highlighter-v2\
To roll back, copy the timestamped backup over <ProjectRoot>\highlighter.html.

IMPORTANT TESTS
- Test 1, 2, 3 and 4 display modes. The 3-split layout should be two cards on top and one centered card below, matching output.
- Test a long verse and a short verse on PC, tablet portrait/landscape, and smartphone portrait/landscape.
- Tap one word; it should toggle once.
- Hold a word for about 0.2 seconds then drag across multiple words; the full word range should highlight once, with no page scrolling.
- Repeat on already-highlighted words to erase a range.
- Confirm output/output.html receives the same highlights.

NOTE
This modifies only highlighter.html. It does not change server.js, output.html, operator code, translations, or the original V1 repository. Real-device testing is still required; browser viewport simulation cannot fully reproduce every touchscreen.
