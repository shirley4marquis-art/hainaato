# HainaAuto Email Sender Logo Setup

This project already embeds the HainaAuto logo inside outgoing email templates. The sender avatar/logo shown in mailbox lists is controlled by mailbox providers, not by email HTML.

To make the HainaAuto logo appear as the sender profile image in Gmail, Yahoo, Apple Mail, Outlook, and other supporting inboxes, configure the sending domain for BIMI.

## Current Domain Status

Checked on 2026-08-22:

- Domain: `hainautocn.com`
- Current DMARC: `v=DMARC1; p=none`
- Current BIMI: no `default._bimi.hainautocn.com` TXT record found
- Current MX: Hostinger mail
- Current SPF: `v=spf1 include:_spf.mail.hostinger.com ~all`

`p=none` is not enough for trusted sender-logo display. BIMI generally requires DMARC enforcement.

## Required DNS Records

Add or update DMARC after SPF and DKIM are correctly aligned for every service that sends mail as `@hainautocn.com`, including Hostinger and Resend.

Recommended final DMARC:

```txt
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:sales@hainautocn.com; adkim=s; aspf=s; pct=100
```

After monitoring confirms no legitimate mail is failing authentication, move to stricter protection:

```txt
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=reject; rua=mailto:sales@hainautocn.com; adkim=s; aspf=s; pct=100
```

Add the BIMI record:

```txt
Host: default._bimi
Type: TXT
Value: v=BIMI1; l=https://hainautocn.com/bimi-logo.svg; a=
```

For Gmail and some major providers, add a VMC or CMC certificate URL after the certificate is issued:

```txt
Host: default._bimi
Type: TXT
Value: v=BIMI1; l=https://hainautocn.com/bimi-logo.svg; a=https://hainautocn.com/vmc.pem
```

## Provider Account Steps

1. Confirm Resend is authenticating the exact sender domain with DKIM records for `hainautocn.com`.
2. Confirm Hostinger mail has DKIM enabled for `hainautocn.com`.
3. Set the mailbox profile image for `sales@hainautocn.com` inside Hostinger or Google Workspace if the mailbox is connected there.
4. Publish DMARC with `p=quarantine` or `p=reject`.
5. Publish the BIMI TXT record.
6. Obtain a VMC or CMC from a supported certificate authority if Gmail verified-logo support is required.
7. Validate with a BIMI validator before relying on inbox display.

## Important Limitation

No website code can force every mailbox provider to show the logo. The logo appears only when the recipient's mailbox provider supports sender logos and trusts the sender domain authentication.
