param (
    [string]$appUiDir = "c:\Users\kevin\Desktop\ai-japanese-app\app-ui"
)

$assetsDir = "$appUiDir\assets"

# Create new directories
$dirsToCreate = @(
    "$assetsDir\ui",
    "$assetsDir\backgrounds",
    "$assetsDir\sprites\characters",
    "$assetsDir\sprites\monsters",
    "$assetsDir\sprites\objects",
    "$assetsDir\tilesets",
    "$assetsDir\fonts"
)

foreach ($dir in $dirsToCreate) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

# 1. UI Elements
Move-Item -Path "$assetsDir\btn_texture.png" -Destination "$assetsDir\ui\btn_texture.png" -ErrorAction SilentlyContinue
Move-Item -Path "$assetsDir\icon_castle.png" -Destination "$assetsDir\ui\icon_castle.png" -ErrorAction SilentlyContinue
Move-Item -Path "$assetsDir\icon_shop.png" -Destination "$assetsDir\ui\icon_shop.png" -ErrorAction SilentlyContinue

# 2. Backgrounds
Move-Item -Path "$assetsDir\town_bg.png" -Destination "$assetsDir\backgrounds\town_bg.png" -ErrorAction SilentlyContinue

# 3. Characters
Move-Item -Path "$assetsDir\FREE Mana Seed Character Base Demo 2.0" -Destination "$assetsDir\sprites\characters\" -ErrorAction SilentlyContinue
Move-Item -Path "$assetsDir\Mana Seed Farmer Sprite Free Sample" -Destination "$assetsDir\sprites\characters\" -ErrorAction SilentlyContinue
Move-Item -Path "$assetsDir\25.07 - Free Mana Seed RPG Starter Pack\character_base" -Destination "$assetsDir\sprites\characters\character_base" -ErrorAction SilentlyContinue
Move-Item -Path "$assetsDir\25.07 - Free Mana Seed RPG Starter Pack\npcs" -Destination "$assetsDir\sprites\characters\npcs" -ErrorAction SilentlyContinue
# Also move existing character sprites to the new structure
Move-Item -Path "$assetsDir\character_sprites\*" -Destination "$assetsDir\sprites\characters\" -ErrorAction SilentlyContinue
Remove-Item -Path "$assetsDir\character_sprites" -Recurse -Force -ErrorAction SilentlyContinue

# 4. Monsters
Move-Item -Path "$assetsDir\25.07 - Free Mana Seed RPG Starter Pack\monsters" -Destination "$assetsDir\sprites\monsters\monsters" -ErrorAction SilentlyContinue

# 5. Objects
Move-Item -Path "$assetsDir\19.07c - Treasure Chests 1.2a" -Destination "$assetsDir\sprites\objects\" -ErrorAction SilentlyContinue
Move-Item -Path "$assetsDir\25.07 - Free Mana Seed RPG Starter Pack\icons & objects" -Destination "$assetsDir\sprites\objects\icons & objects" -ErrorAction SilentlyContinue

# 6. Tilesets
Move-Item -Path "$assetsDir\25.07 - Free Mana Seed RPG Starter Pack\tilesets" -Destination "$assetsDir\tilesets\tilesets" -ErrorAction SilentlyContinue

# 7. Fonts
Move-Item -Path "$assetsDir\25.07 - Free Mana Seed RPG Starter Pack\fonts" -Destination "$assetsDir\fonts\fonts" -ErrorAction SilentlyContinue

# Cleanup empty Starter Pack folder
Remove-Item -Path "$assetsDir\25.07 - Free Mana Seed RPG Starter Pack" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Assets organized successfully."
