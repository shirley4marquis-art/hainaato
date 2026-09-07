Noto Sans SC Regular is derived from the official Noto CJK variable TrueType
font at weight 400. Source:
https://github.com/notofonts/noto-cjk/blob/main/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf

The accompanying OFL-NotoSansCJK.txt permits embedding and redistribution.
The static instance was produced with FontTools varLib.instancer (wght=400).
Production needs only the resulting TTF, not Python or FontTools.

Latin overlay text uses Helvetica, Times or Courier as configured. Unsupported
Latin characters and Chinese use this fallback. HarfBuzz (subset-font) creates
one valid TrueType subset per generated PDF; pdf-lib embeds it without running
fontkit's subsetter. Visual tests found missing Chinese outlines with fontkit
subsetting, even when text extraction succeeded.
