// Copyright (c) 2022 Safe Online World Ltd.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// 4:38 AM 5/22/2020
// by rajib chy
import expect from 'expect';
import { wsClient, IWsClientInfo, ISowSocketServer, ISowSocketInfo, IOSocket, ISession, ISowServer } from '../index';
const clientInfo: IWsClientInfo = wsClient();
clientInfo.on( "beforeInitiateConnection", ( session: ISession, socket: IOSocket ) => {
    /*if ( !session.isAuthenticated ) {
        return socket.emit( "unauthorized", "Authentication failed" ), socket.disconnect( true ), false;
    }*/
    return true;
} );
clientInfo.on( "getClient", ( me: ISowSocketInfo, session: ISession, wsServer: ISowSocketServer, server: ISowServer ) => {
    const _client = {
        'test-msg': ( data: any ): void => {
            expect( me.socket ).toBeDefined();
            expect( wsServer.isActiveSocket( me.token ) ).toEqual( true );
            expect( wsServer.exists( me.hash || "no_hash"  ) ).toEqual( true );
            expect( wsServer.getOwners( me.group || "no_group" ).length ).toEqual( 0 );
            expect( wsServer.getOwners().length ).toEqual( 0 );
            expect( wsServer.findByHash( me.hash || "no_hash" ).length ).toEqual( me.isAuthenticated ? 1 : 0 );
            expect( wsServer.findByLogin( me.loginId || "un_authorized" ).length ).toEqual( me.isAuthenticated ? 1 : 0 );
            expect( wsServer.toList( [] ).length ).toEqual( 0 );
            if ( me.isAuthenticated ) {
                expect( wsServer.toList( wsServer.getClientByExceptHash( me.hash || "no_hash" ) ).length ).toEqual( 0 );
                expect( wsServer.getClientByExceptLogin( me.loginId || "un_authorized" ).length ).toEqual( 0 );
            } else {
                expect( wsServer.toList( wsServer.getClientByExceptHash( me.hash || "no_hash" ) ).length ).toBeGreaterThan( 0 );
                expect( wsServer.getClientByExceptLogin( me.loginId || "un_authorized" ).length ).toBeGreaterThan( 0 );
            }
            expect( wsServer.clients.length ).toBeGreaterThan( 0 );
            expect( wsServer.findByRoleId( 'Admin' ).length ).toBeGreaterThanOrEqual( 0 );
            expect( wsServer.findByToken( 'xxx' ).length ).toBeGreaterThanOrEqual( 0 );
            expect( wsServer.getClientByExceptHash( me.hash || "no_hash", me.group || "no_group" ).length ).toEqual( 0 );
            expect( wsServer.getClientByExceptLogin( me.loginId || "un_authorized", me.group || "no_group" ).length ).toEqual( 0 );
            expect( wsServer.getClientByExceptToken( me.token, me.group || "no_group" ).length ).toEqual( 0 );
            expect( wsServer.sendMsg( "XX-INVALID-TOKEN", "on-test-msg", data ) ).toEqual( false );
            expect( wsServer.removeSocket( "XX-INVALID-TOKEN" ) ).toEqual( false );
            me.isOwner = true;
            me.group = "TEST_GROUP";
            expect( wsServer.getOwners( me.group ).length ).toBeGreaterThan( 0 );
            if ( me.hash && me.loginId ) {
                expect( wsServer.toList( wsServer.getClientByExceptHash( "INVALID_HASH", me.group ) ).length ).toBeGreaterThan( 0 );
                expect( wsServer.getClientByExceptLogin( "INVALID_LOGIN", me.group ).length ).toBeGreaterThan( 0 );
                expect( wsServer.getClientByExceptToken( "INVALID_TOKEN", me.group ).length ).toBeGreaterThan( 0 );
            }
            wsServer.sendMsg( me.token, "on-test-msg", data );
            const socket = wsServer.getSocket( me.token );
            // @ts-ignore
            clientInfo.emit("disConnecteds", me, wsServer);
            if ( socket ) {
                socket.socket.disconnect(true);
            }
            expect( wsServer.removeSocket( me.token ) ).toBeFalsy();
            return void 0;
        }
    };
    return !me ? {
        server: Object.keys( _client ),
        client: []
    } : _client;
} );
clientInfo.on( "connected", ( me: ISowSocketInfo, wsServer: ISowSocketServer ) => {
    const method = me.isReconnectd ? "on-re-connected-user" : "on-connect-user";
    wsServer.getClientByExceptToken( me.token ).forEach( conn => {
        conn.sendMsg( method, {
            token: me.token, hash: me.hash, loginId: me.loginId
        } );
    } );
    // Here connect any user
    me.sendMsg( me.isReconnectd ? "on-re-connected" : "on-connected", {
        token: me.token, hash: me.hash, loginId: me.loginId
    } );
} );
clientInfo.on( "disConnected", ( me: ISowSocketInfo, wsServer: ISowSocketServer ) => {
    // Here disconnect any user
    wsServer.getClientByExceptToken( me.token ).forEach( conn => {
        conn.sendMsg( "on-disconnected-user", {
            token: me.token, hash: me.hash, loginId: me.loginId
        } );
    } );
} );
const error1: IWsClientInfo = wsClient();
error1.on( "getClient", ( me: ISowSocketInfo, session: ISession, wsServer: ISowSocketServer, server: ISowServer ) => {
    const _client = {
        'test-msg': ( data: any ) => {
            return wsServer.sendMsg( me.token, "on-test-msg", data );
        }
    };
    return !me ? {
        server: Object.keys( _client ),
        client: []
    } : _client;
} );
export function SocketErr1(): IWsClientInfo {
    return error1;
}
const error2: IWsClientInfo = wsClient();
error2.on( "beforeInitiateConnection", ( session: ISession, socket: IOSocket ) => {
    /*if ( !session.isAuthenticated ) {
        return socket.emit( "unauthorized", "Authentication failed" ), socket.disconnect( true ), false;
    }*/
    return true;
} );
export function SocketErr2(): IWsClientInfo {
    return error2;
}
export function SocketClient(): IWsClientInfo {
    return clientInfo;
}