import os
import time
import struct
import secrets
from Crypto.Hash import keccak as _keccak
from eth_keys import keys as eth_keys_lib


def keccak256(data: bytes) -> bytes:
    k = _keccak.new(digest_bits=256)
    k.update(data)
    return k.digest()


def sign_rp_request(action: str) -> dict:
    key_hex = os.environ["WORLD_ID_SIGNER_KEY"].removeprefix("0x")
    key_bytes = bytes.fromhex(key_hex)

    nonce = secrets.token_bytes(32)
    created_at = int(time.time() * 1000)   # milliseconds
    expires_at = created_at + 600_000       # 10 minutes

    action_hash = keccak256(action.encode("utf-8"))

    # World ID v4 message: version(1) + nonce(32) + created_at(8 BE) + expires_at(8 BE) + action_hash(32)
    msg = (
        bytes([0x01])
        + nonce
        + struct.pack(">Q", created_at)
        + struct.pack(">Q", expires_at)
        + action_hash
    )

    # EIP-191 sign
    prefix = f"\x19Ethereum Signed Message:\n{len(msg)}".encode()
    msg_hash = keccak256(prefix + msg)

    private_key = eth_keys_lib.PrivateKey(key_bytes)
    sig = private_key.sign_msg_hash(msg_hash)

    # Output: r(32) || s(32) || v(1), where v = recovery_id + 27
    sig_bytes = (
        sig.r.to_bytes(32, "big")
        + sig.s.to_bytes(32, "big")
        + bytes([sig.v + 27])
    )

    return {
        "nonce": "0x" + nonce.hex(),
        "created_at": created_at,
        "expires_at": expires_at,
        "sig": "0x" + sig_bytes.hex(),
    }
