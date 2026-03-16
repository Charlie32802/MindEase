import hmac
import hashlib
import struct
import zlib
import base64
import random
import time

ROLE_PUBLISHER = 1
ROLE_SUBSCRIBER = 2

kJoinChannel = 1
kPublishAudioStream = 2
kPublishVideoStream = 3
kPublishDataStream = 4


def _pack_uint16(x):
    return struct.pack('<H', int(x))


def _pack_uint32(x):
    return struct.pack('<I', int(x))


def _pack_string(s):
    if isinstance(s, str):
        s = s.encode('utf-8')
    return _pack_uint16(len(s)) + s


def _pack_map_uint32(d):
    ret = _pack_uint16(len(d))
    for k in sorted(d.keys()):
        ret += _pack_uint16(k) + _pack_uint32(d[k])
    return ret


class _AccessToken:
    def __init__(self, app_id, app_certificate, channel_name, uid):
        self.app_id = app_id
        self.app_certificate = app_certificate
        self.channel_name = channel_name
        self.uid = str(uid) if uid != 0 else ''
        self.ts = int(time.time()) + 100
        self.salt = random.randint(1, 0xFFFFFFFF)
        self.messages = {}

    def add_privilege(self, key, expire_ts):
        self.messages[key] = expire_ts

    def build(self):
        m = (
            _pack_string(self.app_id)
            + _pack_uint32(self.ts)
            + _pack_uint32(self.salt)
            + _pack_map_uint32(self.messages)
        )

        val = self.channel_name.encode('utf-8') + self.uid.encode('utf-8') + m

        sig = hmac.new(
            self.app_certificate.encode('utf-8'), val, hashlib.sha256
        ).digest()

        crc_channel = zlib.crc32(self.channel_name.encode('utf-8')) & 0xFFFFFFFF
        crc_uid = zlib.crc32(self.uid.encode('utf-8')) & 0xFFFFFFFF

        content = (
            _pack_string(sig)
            + _pack_uint32(crc_channel)
            + _pack_uint32(crc_uid)
            + _pack_string(m)
        )

        return '006' + self.app_id + base64.b64encode(content).decode('utf-8')


def build_token_with_uid(app_id, app_certificate, channel_name, uid, role, privilege_expired_ts):
    token = _AccessToken(app_id, app_certificate, channel_name, uid)
    token.add_privilege(kJoinChannel, privilege_expired_ts)
    if role == ROLE_PUBLISHER:
        token.add_privilege(kPublishAudioStream, privilege_expired_ts)
        token.add_privilege(kPublishVideoStream, privilege_expired_ts)
        token.add_privilege(kPublishDataStream, privilege_expired_ts)
    return token.build()