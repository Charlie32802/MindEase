from channels.generic.websocket import AsyncWebsocketConsumer
import json


class SessionNotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.group_name = f"user_{self.user_id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def session_started(self, event):
        await self.send(text_data=json.dumps(event))

    async def appointment_booked(self, event):
        await self.send(text_data=json.dumps(event))

    async def appointment_cancelled(self, event):
        await self.send(text_data=json.dumps(event))

    async def availability_removed(self, event):
        await self.send(text_data=json.dumps(event))


class SessionChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.appointment_id = self.scope['url_route']['kwargs']['appointment_id']
        self.room_group_name = f'session_{self.appointment_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', 'chat')

        if msg_type == 'reaction':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'reaction_message',
                    'emoji': data.get('emoji', ''),
                    'sender': data.get('sender', ''),
                }
            )
        else:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': data.get('message', ''),
                    'sender': data.get('sender', ''),
                }
            )

    async def session_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'session_ended',
        }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
        }))

    async def reaction_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reaction',
            'emoji': event['emoji'],
            'sender': event['sender'],
        }))