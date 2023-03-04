# `<pgp-signed>` - Verify PGP Signature

> Component verifing digital signature of PGP message

## Getting started

Start by downloading source file from `dist/pgp-signed.js` and include it in your webpage with a script tag.

```html
<script src="pgp-signed.js"></script>
```

Put a cleartext message between `<pgp-signed>` tags in your page.

```html
<pgp-signed>
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Hello world !
-----BEGIN PGP SIGNATURE-----

[... pgp signature ...]

-----END PGP SIGNATURE-----
</pgp-signed>
```

> **TIP** To sign a cleartext message using gpg you can use the following command line
> 
> ```sh-shell
> echo "Your message to sign" | gpg --cleartext -u your-key-identity@example.com
> ```

Message signature is checked but isn't verified because we did not gave the public key to verify it.
Put your armored public key on your server and set the path to your key in the `key-src` attribute.

```html
<pgp-signed key-src="mey-key.asc">
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Hello world !
-----BEGIN PGP SIGNATURE-----

[... pgp signature ...]

-----END PGP SIGNATURE-----
</pgp-signed>
```

> **TIP** You can alternatively an absolute path to a HTTP pgp keyserver like [keys.openpgp.org](https://keys.openpgp.org/)

if your message was signed by the key, block switch to "Verified" state.

> **TIP** You can export your public key using gpg with the following command
>
> ```sh-session
> gpg -a --export your-key-identity@example.com
> ```

## API Doc

### `<pgp-signed>` (`PGPSignedElement`)

Verify signature of a cleartext pgp message and display it as HTML

```html
<pgp-signed key-src="mey-key.asc">
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Hello world !
-----BEGIN PGP SIGNATURE-----

[... pgp signature ...]

-----END PGP SIGNATURE-----
</pgp-signed>
```

#### Attributes

|Attribute name|JS Property|Description|
|--------------|-----------|-----------|
|`key-src`     |`keySrc`   |URL of the key to use for message verification. If not provided, message will not be verified|

#### Slots

|Slot Name|Description|
|---------|-----------|
|`message`|PGP signed cleartext message to verify. **NOTE** if not provided, text content of the element will be considered as message|

#### Events

Currently, no customp events are emitted

#### CSS Properties

|Property name|Default value|Description|
|-------------|-------------|-----------|
|`--pgp-verified-color`|`#209b01`|Color used to signify the message was successfuly verified|
|`--pgp-unverified-color`|`#fc3c11`|Color used to signify the message failed to be verified|