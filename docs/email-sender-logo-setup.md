# Nindge Automobile Email DNS Setup

This project already embeds the HainaAuto logo inside outgoing email templates. The sender avatar/logo shown in mailbox lists is controlled by mailbox providers, not by email HTML.

To make the HainaAuto logo appear as the sender profile image in Gmail, Yahoo, Apple Mail, Outlook, and other supporting inboxes, configure the sending domain for BIMI.

## Current Domain Status

Checked on 2026-09-11:

- Resend domain: `nindgeauto.com`
- Resend status: `failed`
- Verified by Resend: `rsend.nindgeauto.com` CNAME and inbound MX
- Failed in Resend: `resend._domainkey.nindgeauto.com` DKIM TXT and `send.nindgeauto.com` CNAME
- Application sender: `info@nindgeauto.com`

Customer quote emails are generated and sent by `app/api/quote-requests/route.ts` after the quote is saved. They include the generated PDF. Resend must verify the sender domain before those messages can be delivered.

## Required Resend Records

Create these records at the authoritative DNS provider for `nindgeauto.com`. If the provider automatically appends the domain, enter only the host shown in the **Name** column.

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCjE9Bcfdla7eYBF9YA9aN1jZ9PupQDs5mNIj2L1xbsejc/x2UQlE0ASpuazeSTKrapAvXNLbPNTOLdcRX9W+EiNDQw5oDihSNpEeFeARvfWxRpUA4UBsKVUvhzFjHxBj7AFjxIUS/258fEEEshXz2aJqYMQvV5RkaacbXlvbvy7QIDAQAB` | Auto |
| CNAME | `send` | `send.forge.rmta.net` | 3600 |

Do not replace the existing verified record:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `rsend` | `rsend-sae1.forge.rmta.net` |

Remove conflicting duplicate records for the same names. After DNS propagation, click **Verify DNS Records** in Resend and confirm the domain status is `verified`.

## Authentication And Logo Records

Add or update DMARC after SPF and DKIM are correctly aligned for every service that sends mail as `@nindgeauto.com`, including Hostinger and Resend.

Recommended final DMARC:

```txt
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:info@nindgeauto.com; adkim=s; aspf=s; pct=100
```

After monitoring confirms no legitimate mail is failing authentication, move to stricter protection:

```txt
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=reject; rua=mailto:info@nindgeauto.com; adkim=s; aspf=s; pct=100
```

Add the BIMI record:

```txt
Host: default._bimi
Type: TXT
Value: v=BIMI1; l=https://nindgeauto.com/bimi-logo.svg; a=
```

For Gmail and some major providers, add a VMC or CMC certificate URL after the certificate is issued:

```txt
Host: default._bimi
Type: TXT
Value: v=BIMI1; l=https://nindgeauto.com/bimi-logo.svg; a=https://nindgeauto.com/vmc.pem
```

## Provider Account Steps

1. Confirm Resend is authenticating the exact sender domain with DKIM records for `nindgeauto.com`.
2. Confirm Hostinger mail has DKIM enabled for `nindgeauto.com`.
3. Set the mailbox profile image for `info@nindgeauto.com` inside Hostinger or Google Workspace if the mailbox is connected there.
4. Publish DMARC with `p=quarantine` or `p=reject`.
5. Publish the BIMI TXT record.
6. Obtain a VMC or CMC from a supported certificate authority if Gmail verified-logo support is required.
7. Validate with a BIMI validator before relying on inbox display.

## Important Limitation

No website code can force every mailbox provider to show the logo. The logo appears only when the recipient's mailbox provider supports sender logos and trusts the sender domain authentication.
