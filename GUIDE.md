# Gallery 54 site guide: editing the site and adding photos

Mac users: type `python3` wherever this guide says `python`. Windows users: if `python` is not found, try `py`.

## Part 1. One-time setup (about 30 minutes)

1. **Install Python.** Download it from python.org. On Windows, tick "Add Python to PATH" in the installer.
2. **Install the photo tool.** Open Terminal (Mac) or Command Prompt (Windows) and run:
   `pip install Pillow`
3. **Make a GitHub account** at github.com, then install **GitHub Desktop** from desktop.github.com and sign in.
4. **Unzip the site.** Unzip `gallery54-site.zip` into a folder you will keep, for example `Documents/gallery54`.
5. **Put the folder on GitHub.** In GitHub Desktop choose File, then Add local repository, and pick the `gallery54` folder. When it says this is not a repository, click "create a repository", then Create. Then click **Publish repository**, name it `gallery54`, and untick "Keep this code private". Free GitHub Pages only works with public repositories.
6. **Turn the website on.** On github.com open your repository, then Settings, then Pages. Under "Build and deployment" set Source to "Deploy from a branch", choose branch `main` and folder `/ (root)`, and click Save. After one or two minutes the page shows your address: `https://<your-account>.github.io/gallery54/`.

## Part 2. Replace the sample photos with yours

1. **Clear the samples.** In your `gallery54` folder, delete the whole `originals` folder and delete everything inside the `photos` folder (keep the empty `photos` folder). You can also delete `tools/make_demo.py`.
2. **Make one folder per rally.** Create a new folder called `originals`, and inside it create `2024`, `2025` and `2026`.
3. **Add your photos.** Copy each rally's photos into its year folder. Use JPEGs, at least 2000 pixels on the long edge. Your full-size originals can go in as they are.
   - **File names matter.** A photo called `IMG_0412.jpg` in the 2026 folder gets the reference `2026-img-0412`. That reference appears under the photo in the viewer and in the enquiry email, so use names you are happy to quote.
4. **Name the photos (optional but recommended).** In each year folder add a file called `captions.csv`. Open a blank sheet in Excel or Google Sheets, type these column names in row 1, fill in one row per photo, then save or download as CSV:
   `file, title, stage, tags, cover`
   - `file` is the exact file name, for example `IMG_0412.jpg`
   - `title` is the caption shown on hover and in the viewer
   - `stage` is shown under the photo in the viewer, for example `Stage 3`
   - `tags` become the filter buttons. Separate several with a semicolon, for example `Action;Crowd`
   - `cover` is `yes` on one photo per year, which becomes that year's hero image. Leave it empty on the rest. Without a `yes`, the first landscape photo is used.
5. **Edit the wording.** Open `site.json` in Notepad or TextEdit (plain text mode) and change:
   - `email` to your real address
   - `intro` and `about` to your own text
   - the `blurb` for each year, and optionally add `"dates": "..."` and `"place": "..."` inside a year
   Keep every quote mark and comma as they are. A missing comma stops the build. If it complains, paste the file into jsonlint.com to find the mistake.
6. **Build the site data.** Open Terminal or Command Prompt in the `gallery54` folder and run:
   `python tools/build_gallery.py`
   It resizes every photo and writes `data/gallery.js`. This can take a minute or two for a few hundred photos.
7. **Preview on your computer.** Double-click `index.html`. Check the photos, captions, filters and the email address.
8. **Publish.** Open GitHub Desktop. It lists the changed files. Type a short summary such as "Add Safari Rally photos", click **Commit to main**, then click **Push origin**. Wait one or two minutes and refresh your website address. If you still see the old version, hold Shift while clicking refresh.

## Part 3. Adding next year's rally

1. Create `originals/2027` and put the photos in it, with an optional `captions.csv`.
2. Open `site.json` and add a 2027 entry under `years`, copying the 2026 entry and changing the year and text. Remember the comma after the entry before it.
3. Run `python tools/build_gallery.py`.
4. Commit and push in GitHub Desktop.

The new year appears first on the page, in the menu and in the hero. Nothing else needs changing. Re-running the script only processes new or changed photos.

## Part 4. Changing the design

- **Colours:** the first block of `css/styles.css` holds the palette. `--marshal` is the yellow accent. The dark-mode colours are in the two blocks just below it.
- **Wording on the page:** headings and buttons are in `index.html`. The intro, about text and email are in `site.json`.
- **Page title and link preview:** the first lines of `index.html`.
- **Animation speed:** the "Motion" block at the bottom of `css/styles.css`.
- **Dark mode:** it follows the visitor's device setting, and the sun/moon button in the menu overrides it and is remembered.
- **Your own domain:** in your repository open Settings, then Pages, and use the Custom domain box.

## If something goes wrong

- **A photo is missing online.** You probably did not run the build, or did not commit the `photos` folder and `data/gallery.js`. Run the build and commit again.
- **`python` or `pip` not found.** Use `python3` and `pip3` (Mac), or reinstall Python with "Add to PATH" ticked (Windows).
- **"No module named PIL".** Run `pip install Pillow` again.
- **The site looks unchanged.** Wait two minutes, then hard refresh.
- **The folder is getting large.** Your full-size originals are ignored by GitHub, so only the web-sized copies are uploaded. GitHub recommends keeping a repository under 1 GB.
