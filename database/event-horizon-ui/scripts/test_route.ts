
import axios from 'axios';

async function testInvocation() {
    const VECTABASE_URL = 'http://localhost:3000';
    const PROJECT_API_KEY = 'eyJh5._def_.pqc_v1_anon_x6SbJWvxLBeB9PpL-DpskiITLj0RwuTX9zZ73Wo68Ek';
    const funcName = 'complex-strategy';

    console.log(`Testing invocation for ${funcName} at ${VECTABASE_URL}...`);

    try {
        const res = await axios.post(`${VECTABASE_URL}/api/v1/functions/${funcName}/invoke`, {
            test: true
        }, {
            headers: { 'Authorization': `Bearer ${PROJECT_API_KEY}` }
        });
        console.log('SUCCESS:', res.status, res.data);
    } catch (err: any) {
        console.log('FAILED:', err.response?.status);
        console.log('DATA:', err.response?.data);
    }
}

testInvocation();
