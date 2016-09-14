import * as sinonChai from "sinon-chai";
import * as chai from "chai";
import * as net from "net";
import {ConnectionHelper} from "../connection/connection_helper";
chai.use(sinonChai);

const expect = chai.expect;

xdescribe('ConnectionHelper', function () {
    it('can be instantiated, with minimal connection setup', function () {
        new ConnectionHelper({remotePort: 10, remoteHost: '123'});
    });

    it('will throw error when it should listen and no PORT, or listen callback is specified', function () {
        expect(()=>new ConnectionHelper({listen: true})).to.throw;
    });

    describe('getNewSocket', function () {
        it('if set to listen, it will setup a temporary server on specified PORT and pass socket to callback', function (done) {

            let helper;

            const connectToHelper = ()=> {
                const client = net.connect(3300, '127.0.0.1', (err)=> {
                    if (err)return done(err);
                    client.setEncoding('utf8');

                    client.on('data', data=> {
                        expect(data).to.equal('expectedData');

                        client.end();
                        helper.shutdown();
                        return done();
                    })
                });
            };

            helper = new ConnectionHelper({
                listen: true,
                localHost: '127.0.0.1',
                localPort: 3300,
                listenCallback: connectToHelper
            });

            return helper.getNewSocket((err, socket)=> {
                if (err)return done(err);
                return socket.write('expectedData');
            })
        });

        it('will connect with remote', function (done) {
            const helper = new ConnectionHelper({
                remoteHost: '127.0.0.1',
                remotePort: 3300,
            });

            const server = net.createServer((client)=> {
                client.setEncoding('utf8');

                client.on('data', (data)=> {
                    expect(data).to.equal('randomText');
                    helper.shutdown();
                    server.close();

                    return done();
                })
            });

            server.listen(3300, ()=> {
                helper.getNewSocket((err, socket)=> {
                    if (err)return (err);

                    return socket.write('randomText');
                })
            });
        })
    });
});