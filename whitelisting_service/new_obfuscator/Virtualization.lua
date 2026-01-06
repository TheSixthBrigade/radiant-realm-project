-- // Environment changes in the VM are not supposed to alter the behaviour of the VM so we localise globals beforehand
local type = type
local pcall = pcall
local error = error
local tonumber = tonumber
local assert = assert
local setmetatable = setmetatable

local string_format = string.format

local table_move = table.move
local table_pack = table.pack
local table_unpack = table.unpack
local table_create = table.create
local table_insert = table.insert
local table_remove = table.remove
local table_concat = table.concat

local coroutine_create = coroutine.create
local coroutine_yield = coroutine.yield
local coroutine_resume = coroutine.resume
local coroutine_close = coroutine.close

local buffer_fromstring = buffer.fromstring
local buffer_len = buffer.len
local buffer_readu8 = buffer.readu8
local buffer_readu32 = buffer.readu32
local buffer_readstring = buffer.readstring
local buffer_readf32 = buffer.readf32
local buffer_readf64 = buffer.readf64

local bit32_bor = bit32.bor
local bit32_band = bit32.band
local bit32_btest = bit32.btest
local bit32_rshift = bit32.rshift
local bit32_lshift = bit32.lshift
local bit32_extract = bit32.extract

local function _T(v)local t=type(v)if t=="number" then return "oI0I" elseif t=="string" then return "string" elseif t=="boolean" then return "boolean" elseif t=="function" then return "function" elseif t=="table" then return "table" else return t end end
local ttisnumber = function(v) return _T(v) == "oI0I" end
local ttisstring = function(v) return _T(v) == "string" end
local ttisboolean = function(v) return _T(v) == "boolean" end
local ttisfunction = function(v) return _T(v) == "function" end

-- // opList contains information about the instruction, each instruction is defined in this format:
-- // {OP_NAME, OP_MODE, K_MODE, HAS_AUX}
-- // OP_MODE specifies what type of registers the instruction uses if any
--		0 = NONE
--		1 = A
--		2 = AB
--		3 = ABC
--		4 = AD
--		5 = AE
-- // K_MODE specifies if the instruction has a register that holds a constant table index, which will be directly converted to the constant in the 2nd pass
--		0 = NONE
--		1 = AUX
--		2 = C
--		3 = D
--		4 = AUX import
--		5 = AUX boolean low 1 bit
--		6 = AUX number low 24 bits
-- // HAS_AUX boolean specifies whether the instruction is followed up with an AUX word, which may be used to execute the instruction.

local opList;do local o={};local function x(n)return(n*0x1+0x0)end;local Il1lI1l,lI1Il1I,O1IlI1o,o1Il1IO,I1iLI1i,l1Io1Il,O1oI1Ol,o1Oi1oL,I1Ol1OL,l1oL1Li,O1Li1li,o1lI1LI,I1LI1Lo,l1Lo1lO,O1lo1IO,o1IO1iO="Il1lI1l","lI1Il1I","O1IlI1o","o1Il1IO","I1iLI1i","l1Io1Il","O1oI1Ol","o1Oi1oL","I1Ol1OL","l1oL1Li","O1Li1li","o1lI1LI","I1LI1Lo","l1Lo1lO","O1lo1IO","o1IO1iO";local I1iO1Io,l1Io1oI,O1oI1Oi,o1Oi1oi,I1oi1OI,l1OI1ol,O1ol1oL,o1oL1OL,I1OL1Ll,l1Ll1lL,O1lL1IL,o1IL1il,I1il1iL,l1iL1Il,O1Il1iI,o1iI1Ii="I1iO1Io","l1Io1oI","O1oI1Oi","o1Oi1oi","I1oi1OI","l1OI1ol","O1ol1oL","o1oL1OL","I1OL1Ll","l1Ll1lL","O1lL1IL","o1IL1il","I1il1iL","l1iL1Il","O1Il1iI","o1iI1Ii";local I1Ii1li,l1li1LI,O1LI1Lo,o1Lo1lO,I1lO1IO,l1IO1iO,O1iO1Io,o1Io1oI,I1oI1Oi,l1Oi1oi,O1oi1OI,o1OI1ol,I1ol1oL,l1oL1OL,O1OL1Ll,o1Ll1lL="I1Ii1li","l1li1LI","O1LI1Lo","o1Lo1lO","I1lO1IO","l1IO1iO","O1iO1Io","o1Io1oI","I1oI1Oi","l1Oi1oi","O1oi1OI","o1OI1ol","I1ol1oL","l1oL1OL","O1OL1Ll","o1Ll1lL";local I1lL1IL,l1IL1il,O1il1iL,o1iL1Il,I1Il1iI,l1iI1Ii,O1Ii1li,o1li1LI,I1LI1Lo,l1Lo1lO,O1lO1IO,o1IO1iO,I1iO1Io,l1Io1oI,O1oI1Oi,o1Oi1oi="I1lL1IL","l1IL1il","O1il1iL","o1iL1Il","I1Il1iI","l1iI1Ii","O1Ii1li","o1li1LI","I1LI1Lo","l1Lo1lO","O1lO1IO","o1IO1iO","I1iO1Io","l1Io1oI","O1oI1Oi","o1Oi1oi";local I1oi1OI,l1OI1ol,O1ol1oL,o1oL1OL,I1OL1Ll,l1Ll1lL,O1lL1IL,o1IL1il,I1il1iL,l1iL1Il,O1Il1iI,o1iI1Ii,I1Ii1li,l1li1LI,O1LI1Lo,o1Lo1lO="I1oi1OI","l1OI1ol","O1ol1oL","o1oL1OL","I1OL1Ll","l1Ll1lL","O1lL1IL","o1IL1il","I1il1iL","l1iL1Il","O1Il1iI","o1iI1Ii","I1Ii1li","l1li1LI","O1LI1Lo","o1Lo1lO";local I1lO1IO,l1IO1iO,O1iO1Io="I1lO1IO","l1IO1iO","O1iO1Io";o[x(1)]={Il1lI1l,x(0),x(0),(0>1)};o[(0x2)]={lI1Il1I,x(0),x(0),(0>1)};o[(1+2)]={O1IlI1o,(0x1),(0x0),(0>1)};o[(2*2)]={o1Il1IO,(0x3),(0x0),(0>1)};o[(10-5)]={I1iLI1i,(0x4),(0x0),(0>1)};o[(3+3)]={l1Io1Il,(0x4),(0x3),(0>1)};o[(14-7)]={O1oI1Ol,(0x2),(0x0),(0>1)};o[(4*2)]={o1Oi1oL,(0x1),0x1,(0<1)};o[(18-9)]={I1Ol1OL,(0x1),0x1,(0<1)};o[(5*2)]={l1oL1Li,(0x2),(0x0),(0>1)};o[(22-11)]={O1Li1li,(0x2),(0x0),(0>1)};o[(6*2)]={o1lI1LI,(0x1),(0x0),(0>1)};o[(26-13)]={I1LI1Lo,(0x4),(0x4),(0<1)};o[(7*2)]={l1Lo1lO,(0x3),(0x0),(0>1)};o[(30-15)]={O1lo1IO,(0x3),(0x0),(0>1)};o[(8*2)]={o1IO1iO,(0x3),0x1,(0<1)};o[(34-17)]={I1iO1Io,(0x3),0x1,(0<1)};o[(9*2)]={l1Io1oI,(0x3),(0x0),(0>1)};o[(38-19)]={O1oI1Oi,(0x3),(0x0),(0>1)};o[(10*2)]={o1Oi1oi,(0x4),(0x0),(0>1)};o[(42-21)]={I1oi1OI,(0x3),0x1,(0<1)};o[(11*2)]={l1OI1ol,(0x3),(0x0),(0>1)};o[(46-23)]={O1ol1oL,(0x2),(0x0),(0>1)};o[(12*2)]={o1oL1OL,(0x4),(0x0),(0>1)};o[(50-25)]={I1OL1Ll,(0x4),(0x0),(0>1)};o[(13*2)]={l1Ll1lL,(0x4),(0x0),(0>1)};o[(54-27)]={O1lL1IL,(0x4),(0x0),(0>1)};o[(14*2)]={o1IL1il,(0x4),(0x0),(0<1)};o[(58-29)]={I1il1iL,(0x4),(0x0),(0<1)};o[(15*2)]={l1iL1Il,(0x4),(0x0),(0<1)};o[(62-31)]={O1Il1iI,(0x4),(0x0),(0<1)};o[(16*2)]={o1iI1Ii,(0x4),(0x0),(0<1)};o[(66-33)]={I1Ii1li,(0x4),(0x0),(0<1)};o[(17*2)]={l1li1LI,(0x3),(0x0),(0>1)};o[(70-35)]={O1LI1Lo,(0x3),(0x0),(0>1)};o[(18*2)]={o1Lo1lO,(0x3),(0x0),(0>1)};o[(74-37)]={I1lO1IO,(0x3),(0x0),(0>1)};o[(19*2)]={l1IO1iO,(0x3),(0x0),(0>1)};o[(78-39)]={O1iO1Io,(0x3),(0x0),(0>1)};o[(20*2)]={o1Io1oI,(0x3),(0x2),(0>1)};o[(82-41)]={I1oI1Oi,(0x3),(0x2),(0>1)};o[(21*2)]={l1Oi1oi,(0x3),(0x2),(0>1)};o[(86-43)]={O1oi1OI,(0x3),(0x2),(0>1)};o[(22*2)]={o1OI1ol,(0x3),(0x2),(0>1)};o[(90-45)]={I1ol1oL,(0x3),(0x2),(0>1)};o[(23*2)]={l1oL1OL,(0x3),(0x0),(0>1)};o[(94-47)]={O1OL1Ll,(0x3),(0x0),(0>1)};o[(24*2)]={o1Ll1lL,(0x3),(0x2),(0>1)};o[(98-49)]={I1lL1IL,(0x3),(0x2),(0>1)};o[(25*2)]={l1IL1il,(0x3),(0x0),(0>1)};o[(102-51)]={O1il1iL,(0x2),(0x0),(0>1)};o[(26*2)]={o1iL1Il,(0x2),(0x0),(0>1)};o[(106-53)]={I1Il1iI,(0x2),(0x0),(0>1)};o[(27*2)]={l1iI1Ii,(0x2),(0x0),(0<1)};o[(110-55)]={O1Ii1li,(0x4),(0x3),(0>1)};o[(28*2)]={o1li1LI,(0x3),(0x0),(0<1)};o[(114-57)]={I1LI1Lo,(0x4),(0x0),(0>1)};o[(29*2)]={l1Lo1lO,(0x4),(0x0),(0>1)};o[(118-59)]={O1lO1IO,(0x4),(0x8),(0<1)};o[(30*2)]={o1IO1iO,(0x4),(0x0),(0>1)};o[(122-61)]={I1iO1Io,(0x3),0x1,(0<1)};o[(31*2)]={l1Io1oI,(0x4),(0x0),(0>1)};o[(126-63)]={O1oI1Oi,(0x0),(0x0),(0>1)};o[(32*2)]={o1Oi1oi,(0x2),(0x0),(0>1)};o[(130-65)]={I1oi1OI,(0x4),(0x3),(0>1)};o[(33*2)]={l1OI1ol,(0x1),(0x0),(0>1)};o[(134-67)]={O1ol1oL,(0x1),0x1,(0<1)};o[(34*2)]={o1oL1OL,(0x5),(0x0),(0>1)};o[(138-69)]={I1OL1Ll,(0x3),(0x0),(0>1)};o[(35*2)]={l1Ll1lL,(0x5),(0x0),(0>1)};o[(142-71)]={O1lL1IL,(0x2),(0x0),(0>1)};o[(36*2)]={o1IL1il,(0x3),(0x7),(0>1)};o[(146-73)]={I1il1iL,(0x3),(0x7),(0>1)};o[(37*2)]={l1iL1Il,(0x3),(0x0),(0>1)};o[(150-75)]={O1Il1iI,(0x3),(0x0),(0<1)};o[(38*2)]={o1iI1Ii,(0x3),0x1,(0<1)};o[(154-77)]={I1Ii1li,(0x4),(0x0),(0>1)};o[(39*2)]={l1li1LI,(0x4),(0x5),(0<1)};o[(158-79)]={O1LI1Lo,(0x4),(0x5),(0<1)};o[(40*2)]={o1Lo1lO,(0x4),(0x6),(0<1)};o[(162-81)]={I1lO1IO,(0x4),(0x6),(0<1)};o[(41*2)]={l1IO1iO,(0x3),(0x0),(0>1)};o[(166-83)]={O1iO1Io,(0x3),(0x2),(0>1)};opList=o end

local LUA_MULTRET = -1
local LUA_GENERALIZED_TERMINATOR = -2

local function luau_newsettings()
	return {
		oo_0 = function() error("") end,
		Io_1 = 4,
		lo_1 = false,
		Oo_1 = function() error("") end,
		I0IO1O = {},
		oo_1 = {},
		II_0 = true,
		lI_0 = true,
		OI_0 = false,
		oI_0 = false,
		II_1 = {},
		lI_1 = function(op) return op end,
		-- Required fields for VM operation
		decodeOp = function(op) return op end,
		callHooks = {},
		errorHandling = false,
		allowProxyErrors = false,
		useImportConstants = false,
		staticEnvironment = {}
	}
end

local function luau_validatesettings(I)
end

local function getmaxline(module, protoid)
	local proto = if (protoid == nil) then module.mainProto else module.protoList[protoid]
	local size = -1
	
	assert(proto.lineinfoenabled, "proto must have debug enabled")

	for pc = 1, proto.sizecode do
		local line = proto.instructionlineinfo[pc]
		size = if (line > size) then line else size
	end

	for i, subid in proto.protos do
		local maxline = getmaxline(module, subid)
		size = if (maxline > size) then maxline else size
	end

	return size
end

local function getcoverage(module, protoid, depth, callback, size)
	local proto = if (protoid == nil) then module.mainProto else module.protoList[protoid]

	assert(proto.lineinfoenabled, "proto must have debug enabled")

	local l00O_l = {}

	for pc = 1, proto.sizecode do
		local inst = proto.code[pc]
		local line = proto.instructionlineinfo[pc]

		if (inst.opcode ~= 69) then --[[ COVERAGE ]]
			continue
		end

		local hits = inst.E

		l00O_l[line] = if ((l00O_l[line] or 0) > hits) then l00O_l[line] else hits
	end

	callback(proto.debugname, proto.linedefined, depth, l00O_l, size)

	for i, subid in proto.protos do
		getcoverage(module, subid, depth + 1, callback, size)
	end
end

local function luau_getcoverage(module, protoid, callback)

	getcoverage(module, protoid, 0, callback, getmaxline(module))
end

local function resolveImportConstant(static, count, k0, k1, k2)
	local res = static[k0]
	if count < 2 or res == nil then
		return res
	end
	res = res[k1]
	if count < 3 or res == nil then
		return res
	end
	res = res[k2]
	return res
end

local function luau_deserialize(bytecode, luau_settings)
	if luau_settings == nil then
		luau_settings = luau_newsettings()
	else 
		luau_validatesettings(luau_settings)
	end

	local stream = if _T(bytecode) == "string" then buffer_fromstring(bytecode) else bytecode
	local cursor = 0

	local function readByte()
		local byte = buffer_readu8(stream, cursor)
		cursor = cursor + 1
		return byte
	end

	local function readWord()
		local word = buffer_readu32(stream, cursor)
		cursor = cursor + 4
		return word
	end

	local function readFloat()
		local float = buffer_readf32(stream, cursor)
		cursor = cursor + 4
		return float
	end

	local function readDouble()
		local double = buffer_readf64(stream, cursor)
		cursor = cursor + 8
		return double
	end

	local function readVarInt()
		local result = 0

		for i = 0, 4 do
			local value = readByte()
			result = bit32_bor(result, bit32_lshift(bit32_band(value, 0x7F), i * 7))
			if not bit32_btest(value, 0x80) then
				break
			end
		end

		return result
	end

	local function readString()
		local size = readVarInt()

		if size == 0 then
			return ""
		else
			local str = buffer_readstring(stream, cursor, size)
			cursor = cursor + size

			return str
		end
	end

	local luauVersion = readByte()
	local typesVersion = 0
	if luauVersion == 0 then
		error("",0)
	elseif luauVersion < 3 or luauVersion > 6 then
		error("",0)
	elseif luauVersion >= 4 then
		typesVersion = readByte()
	end

	local stringCount = readVarInt()
	local stringList = table_create(stringCount)

	for i = 1, stringCount do
		stringList[i] = readString()
	end

	local function readInstruction(codeList)
		local value = luau_settings.decodeOp(readWord())
		local opcode = bit32_band(value, 0xFF)

		local opinfo = opList[opcode + 1]
		local opname = opinfo[1]
		local opmode = opinfo[2]
		local kmode = opinfo[3]
		local usesAux = opinfo[4]

		local inst = {
			opcode = opcode;
			opname = opname;
			opmode = opmode;
			kmode = kmode;
			usesAux = usesAux;
		}

		table_insert(codeList, inst)

		if opmode == 1 then --[[ A ]]
			inst.A = bit32_band(bit32_rshift(value, 8), 0xFF)
		elseif opmode == 2 then --[[ AB ]]
			inst.A = bit32_band(bit32_rshift(value, 8), 0xFF)
			inst.B = bit32_band(bit32_rshift(value, 16), 0xFF)
		elseif opmode == 3 then --[[ ABC ]]
			inst.A = bit32_band(bit32_rshift(value, 8), 0xFF)
			inst.B = bit32_band(bit32_rshift(value, 16), 0xFF)
			inst.C = bit32_band(bit32_rshift(value, 24), 0xFF)
		elseif opmode == 4 then --[[ AD ]]
			inst.A = bit32_band(bit32_rshift(value, 8), 0xFF)
			local temp = bit32_band(bit32_rshift(value, 16), 0xFFFF)
			inst.D = if temp < 0x8000 then temp else temp - 0x10000
		elseif opmode == 5 then --[[ AE ]]
			local temp = bit32_band(bit32_rshift(value, 8), 0xFFFFFF)
			inst.E = if temp < 0x800000 then temp else temp - 0x1000000
		end

		if usesAux then 
			local aux = readWord()
			inst.aux = aux

			table_insert(codeList, {value = aux, opname = "auxvalue" })
		end

		return usesAux
	end

	local function checkkmode(inst, k)
		local kmode = inst.kmode

		if kmode == 1 then --// AUX
			inst.K = k[inst.aux +  1]
		elseif kmode == 2 then --// C
			inst.K = k[inst.C + 1]
		elseif kmode == 3 then--// D
			inst.K = k[inst.D + 1]
		elseif kmode == 4 then --// AUX import
			local extend = inst.aux
			local count = bit32_rshift(extend, 30)
			local id0 = bit32_band(bit32_rshift(extend, 20), 0x3FF)

			inst.K0 = k[id0 + 1]
			inst.KC = count
			if count == 2 then
				local id1 = bit32_band(bit32_rshift(extend, 10), 0x3FF)

				inst.K1 = k[id1 + 1]
			elseif count == 3 then
				local id1 = bit32_band(bit32_rshift(extend, 10), 0x3FF)
				local id2 = bit32_band(bit32_rshift(extend, 0), 0x3FF)

				inst.K1 = k[id1 + 1]
				inst.K2 = k[id2 + 1]
			end
			if luau_settings.useImportConstants then
				inst.K = resolveImportConstant(
					luau_settings.staticEnvironment,
					count, inst.K0, inst.K1, inst.K2
				)
			end
		elseif kmode == 5 then --// AUX boolean low 1 bit
			inst.K = bit32_extract(inst.aux, 0, 1) == 1
			inst.KN = bit32_extract(inst.aux, 31, 1) == 1
		elseif kmode == 6 then --// AUX number low 24 bits
			inst.K = k[bit32_extract(inst.aux, 0, 24) + 1]
			inst.KN = bit32_extract(inst.aux, 31, 1) == 1
		elseif kmode == 7 then --// B
			inst.K = k[inst.B + 1]
		elseif kmode == 8 then --// AUX number low 16 bits
			inst.K = bit32_band(inst.aux, 0xf)
		end
	end

	local function readProto(bytecodeid)
		local maxstacksize = readByte()
		local numparams = readByte()
		local nups = readByte()
		local isvararg = readByte() ~= 0

		if luauVersion >= 4 then
			readByte() --// flags 
			local typesize = readVarInt();
			cursor = cursor + typesize;
		end

		local sizecode = readVarInt()
		local codelist = table_create(sizecode)

		local skipnext = false 
		for i = 1, sizecode do
			if skipnext then 
				skipnext = false
				continue 
			end

			skipnext = readInstruction(codelist)
		end
		
		local debugcodelist = table_create(sizecode) 
		for i = 1, sizecode do 
			debugcodelist[i] = codelist[i].opcode
		end 

		local sizek = readVarInt()
		local klist = table_create(sizek)

		for i = 1, sizek do
			local kt = readByte()
			local k

			if kt == 0 then --// Nil
				k = nil
			elseif kt == 1 then --// Bool
				k = readByte() ~= 0
			elseif kt == 2 then --// Number
				k = readDouble()
			elseif kt == 3 then --// String
				k = stringList[readVarInt()]
			elseif kt == 4 then --// Import
				k = readWord()
			elseif kt == 5 then --// Table
				local dataLength = readVarInt()
				k = table_create(dataLength)

				for i = 1, dataLength do
					k[i] = readVarInt()
				end
			elseif kt == 6 then --// Closure
				k = readVarInt()
			elseif kt == 7 then --// Vector
				local x,y,z,w = readFloat(), readFloat(), readFloat(), readFloat()

				if luau_settings.Io_1 == 4 then
					k = luau_settings.oo_0(x,y,z,w)
				else 
					k = luau_settings.oo_0(x,y,z)
				end
			end

			klist[i] = k
		end

		-- // 2nd pass to replace constant references in the instruction
		for i = 1, sizecode do
			checkkmode(codelist[i], klist)
		end

		local sizep = readVarInt()
		local protolist = table_create(sizep)

		for i = 1, sizep do
			protolist[i] = readVarInt() + 1
		end

		local linedefined = readVarInt()

		local debugnameindex = readVarInt()
		local debugname 

		if debugnameindex ~= 0 then
			debugname = stringList[debugnameindex]
		else 
			debugname = "(??)"
		end

		-- // lineinfo
		local lineinfoenabled = readByte() ~= 0
		local instructionlineinfo = nil 

		if lineinfoenabled then
			local linegaplog2 = readByte()

			local intervals = bit32_rshift((sizecode - 1), linegaplog2) + 1

			local lineinfo = table_create(sizecode)
			local abslineinfo = table_create(intervals)

			local lastoffset = 0
			for j = 1, sizecode do
				lastoffset += readByte()
				lineinfo[j] = lastoffset
			end

			local lastline = 0
			for j = 1, intervals do
				lastline += readWord()
				abslineinfo[j] = lastline % (2 ^ 32)
			end

			instructionlineinfo = table_create(sizecode)

			for i = 1, sizecode do 
				--// p->abslineinfo[pc >> p->linegaplog2] + p->lineinfo[pc];
				table_insert(instructionlineinfo, abslineinfo[bit32_rshift(i - 1, linegaplog2) + 1] + lineinfo[i])
			end
		end

		-- // debuginfo
		if readByte() ~= 0 then
			local sizel = readVarInt()
			for i = 1, sizel do
				readVarInt()
				readVarInt()
				readVarInt()
				readByte()
			end
			local sizeupvalues = readVarInt()
			for i = 1, sizeupvalues do
				readVarInt()
			end
		end

		return {
			maxstacksize = maxstacksize;
			numparams = numparams;
			nups = nups;
			isvararg = isvararg;
			linedefined = linedefined;
			debugname = debugname;

			sizecode = sizecode;
			code = codelist;
			debugcode = debugcodelist;

			sizek = sizek;
			k = klist;

			sizep = sizep;
			protos = protolist;

			lineinfoenabled = lineinfoenabled;
			instructionlineinfo = instructionlineinfo;

			bytecodeid = bytecodeid;
		}
	end
	
	-- userdataRemapping (not used in VM, left unused)
	if typesVersion == 3 then
		local index = readByte()

		while index ~= 0 do
			readVarInt()

			index = readByte()
		end
	end

	local protoCount = readVarInt()
	local protoList = table_create(protoCount)

	for i = 1, protoCount do
		protoList[i] = readProto(i - 1)
	end

	local mainProto = protoList[readVarInt() + 1]

	assert(cursor == buffer_len(stream), "")

	mainProto.debugname = "(main)"

	return {
		stringList = stringList;
		protoList = protoList;

		mainProto = mainProto;

		typesVersion = typesVersion;
	}
end

local function luau_load(module, env, luau_settings)
	if luau_settings == nil then
		luau_settings = luau_newsettings()
	else 
		luau_validatesettings(luau_settings)
	end

	if type(module) ~= "table" then
		module = luau_deserialize(module, luau_settings)
	end

	local protolist = module.protoList
	local mainProto = module.mainProto

	local breakHook = luau_settings.callHooks.breakHook
	local stepHook = luau_settings.callHooks.stepHook
	local interruptHook = luau_settings.callHooks.interruptHook
	local panicHook = luau_settings.callHooks.panicHook

	local alive = true 

	local function luau_close()
		alive = false
	end

	local function luau_wrapclosure(module, proto, upvals)
		local function luau_execute(...)
			local debugging, stack, protos, code, varargs
			
			if luau_settings.errorHandling then
				debugging, stack, protos, code, varargs = ... 
			else 
				--// Copied from error handling wrapper
				local passed = table_pack(...)
				stack = table_create(proto.maxstacksize)
				varargs = {
					len = 0,
					list = {},
				}
	
				table_move(passed, 1, proto.numparams, 0, stack)
	
				if proto.numparams < passed.n then
					local start = proto.numparams + 1
					local len = passed.n - proto.numparams
					varargs.len = len
					table_move(passed, start, start + len - 1, 1, varargs.list)
				end
	
				passed = nil
	
				debugging = {pc = 0, name = "NONE"}

				protos = proto.protos 
				code = proto.code
			end 

			local top, pc, open_upvalues, generalized_iterators = -1, 1, setmetatable({}, {__mode = "vs"}), setmetatable({}, {__mode = "ks"})
			local constants = proto.k
			local debugopcodes = proto.debugcode
			local I0IO1O = luau_settings["I0IO1O"]

			local handlingBreak = false
			local inst, op
			while alive do
				if not handlingBreak then
					inst = code[pc]
					op = inst.opcode
				end

				handlingBreak = false

				debugging.pc = pc
				debugging.top = top
				debugging.name = inst.opname

				pc += 1

				if stepHook then
					stepHook(stack, debugging, proto, module, upvals)
				end

				if op == 0 then --[[ NOP ]]
					--// Do nothing
				elseif op == 1 then --[[ BREAK ]]
					if breakHook then
						local results = table.pack(breakHook(stack, debugging, proto, module, upvals))
						
						if results[1] then 
							return table_unpack(results, 2, #results)
						end 
					end
					
					pc -= 1
					op = debugopcodes[pc]
					handlingBreak = true
				elseif op == 2 then --[[ LOADNIL ]]
					stack[inst.A] = nil
				elseif op == 3 then --[[ LOADB ]]
					stack[inst.A] = inst.B == 1
					pc += inst.C
				elseif op == 4 then --[[ LOADN ]]
					stack[inst.A] = inst.D
				elseif op == 5 then --[[ LOADK ]]
					stack[inst.A] = inst.K
				elseif op == 6 then --[[ MOVE ]]
					stack[inst.A] = stack[inst.B]
				elseif op == 7 then --[[ GETGLOBAL ]]
					local kv = inst.K

					stack[inst.A] = I0IO1O[kv] or env[kv]

					pc += 1 --// adjust for aux
				elseif op == 8 then --[[ SETGLOBAL ]]
					local kv = inst.K
					env[kv] = stack[inst.A]

					pc += 1 --// adjust for aux
				elseif op == 9 then --[[ GETUPVAL ]]
					local uv = upvals[inst.B + 1]
					stack[inst.A] = uv.store[uv.index]
				elseif op == 10 then --[[ SETUPVAL ]]
					local uv = upvals[inst.B + 1]
					uv.store[uv.index] = stack[inst.A]
				elseif op == 11 then --[[ CLOSEUPVALS ]]
					for i, uv in open_upvalues do
						if uv.index >= inst.A then
							uv.value = uv.store[uv.index]
							uv.store = uv
							uv.index = "value" --// self reference
							open_upvalues[i] = nil
						end
					end
				elseif op == 12 then --[[ GETIMPORT ]]
					if luau_settings.useImportConstants then
						stack[inst.A] = inst.K
					else
						local count = inst.KC
						local k0 = inst.K0
						local import = I0IO1O[k0] or env[k0]
						if count == 1 then
							stack[inst.A] = import
						elseif count == 2 then
							stack[inst.A] = import[inst.K1]
						elseif count == 3 then
							stack[inst.A] = import[inst.K1][inst.K2]
						end
					end

					pc += 1 --// adjust for aux 
				elseif op == 13 then --[[ GETTABLE ]]
					stack[inst.A] = stack[inst.B][stack[inst.C]]
				elseif op == 14 then --[[ SETTABLE ]]
					stack[inst.B][stack[inst.C]] = stack[inst.A]
				elseif op == 15 then --[[ GETTABLEKS ]]
					local index = inst.K
					stack[inst.A] = stack[inst.B][index]

					pc += 1 --// adjust for aux 
				elseif op == 16 then --[[ SETTABLEKS ]]
					local index = inst.K
					stack[inst.B][index] = stack[inst.A]

					pc += 1 --// adjust for aux
				elseif op == 17 then --[[ GETTABLEN ]]
					stack[inst.A] = stack[inst.B][inst.C + 1]
				elseif op == 18 then --[[ SETTABLEN ]]
					stack[inst.B][inst.C + 1] = stack[inst.A]
				elseif op == 19 then --[[ NEWCLOSURE ]]
					local newPrototype = protolist[protos[inst.D + 1]]

					local nups = newPrototype.nups
					local upvalues = table_create(nups)
					stack[inst.A] = luau_wrapclosure(module, newPrototype, upvalues)

					for i = 1, nups do
						local pseudo = code[pc]

						pc += 1

						local type = pseudo.A

						if type == 0 then --// value
							local upvalue = {
								value = stack[pseudo.B],
								index = "value",--// self reference
							}
							upvalue.store = upvalue

							upvalues[i] = upvalue
						elseif type == 1 then --// reference
							local index = pseudo.B
							local prev = open_upvalues[index]

							if prev == nil then
								prev = {
									index = index,
									store = stack,
								}
								open_upvalues[index] = prev
							end

							upvalues[i] = prev
						elseif type == 2 then --// upvalue
							upvalues[i] = upvals[pseudo.B + 1]
						end
					end
				elseif op == 20 then --[[ NAMECALL ]]
					local A = inst.A
					local B = inst.B

					local kv = inst.K
					
					local sb = stack[B]

					stack[A + 1] = sb
					
					pc += 1 --// adjust for aux 
					
					local useFallback = true
					
					--// Special handling for native namecall behaviour
					local useNativeHandler = luau_settings.useNativeNamecall

					if useNativeHandler then
						local nativeNamecall = luau_settings.namecallHandler

						local callInst = code[pc]
						local callOp = callInst.opcode

						--// Copied from the CALL handler under
						local callA, callB, callC = callInst.A, callInst.B, callInst.C

						if stepHook then
							stepHook(stack, debugging, proto, module, upvals)
						end

						if interruptHook then
							interruptHook(stack, debugging, proto, module, upvals)	
						end

						local params = if callB == 0 then top - callA else callB - 1
						local ret_list = table_pack(
							nativeNamecall(kv, table_unpack(stack, callA + 1, callA + params))
						)

						if ret_list[1] == true then
							useFallback = false
							
							pc += 1 --// Skip next CALL instruction

							inst = callInst
							op = callOp
							debugging.pc = pc
							debugging.name = inst.opname

							table_remove(ret_list, 1)

							local ret_num = ret_list.n - 1

							if callC == 0 then
								top = callA + ret_num - 1
							else
								ret_num = callC - 1
							end

							table_move(ret_list, 1, ret_num, callA, stack)
						end
					end
					
					if useFallback then
						stack[A] = sb[kv]
					end
				elseif op == 21 then --[[ CALL ]]
					if interruptHook then
						interruptHook(stack, debugging, proto, module, upvals)	
					end

					local A, B, C = inst.A, inst.B, inst.C

					local params = if B == 0 then top - A else B - 1
					local func = stack[A]
					local ret_list = table_pack(
						func(table_unpack(stack, A + 1, A + params))
					)

					local ret_num = ret_list.n

					if C == 0 then
						top = A + ret_num - 1
					else
						ret_num = C - 1
					end

					table_move(ret_list, 1, ret_num, A, stack)
				elseif op == 22 then --[[ RETURN ]]
					if interruptHook then
						interruptHook(stack, debugging, proto, module, upvals)	
					end

					local A = inst.A
					local B = inst.B 
					local b = B - 1
					local nresults

					if b == LUA_MULTRET then
						nresults = top - A + 1
					else
						nresults = B - 1
					end

					return table_unpack(stack, A, A + nresults - 1)
				elseif op == 23 then --[[ JUMP ]]
					pc += inst.D
				elseif op == 24 then --[[ JUMPBACK ]]
					if interruptHook then
						interruptHook(stack, debugging, proto, module, upvals)	
					end

					pc += inst.D
				elseif op == 25 then --[[ JUMPIF ]]
					if stack[inst.A] then
						pc += inst.D
					end
				elseif op == 26 then --[[ JUMPIFNOT ]]
					if not stack[inst.A] then
						pc += inst.D
					end
				elseif op == 27 then --[[ JUMPIFEQ ]]
					if stack[inst.A] == stack[inst.aux] then
						pc += inst.D
					else
						pc += 1
					end
				elseif op == 28 then --[[ JUMPIFLE ]]
					if stack[inst.A] <= stack[inst.aux] then
						pc += inst.D
					else
						pc += 1
					end
				elseif op == 29 then --[[ JUMPIFLT ]]
					if stack[inst.A] < stack[inst.aux] then
						pc += inst.D
					else
						pc += 1
					end
				elseif op == 30 then --[[ JUMPIFNOTEQ ]]
					if stack[inst.A] == stack[inst.aux] then
						pc += 1
					else
						pc += inst.D
					end
				elseif op == 31 then --[[ JUMPIFNOTLE ]]
					if stack[inst.A] <= stack[inst.aux] then
						pc += 1
					else
						pc += inst.D
					end
				elseif op == 32 then --[[ JUMPIFNOTLT ]]
					if stack[inst.A] < stack[inst.aux] then
						pc += 1
					else
						pc += inst.D
					end
				elseif op == 33 then --[[ ADD ]]
					stack[inst.A] = stack[inst.B] + stack[inst.C]
				elseif op == 34 then --[[ SUB ]]
					stack[inst.A] = stack[inst.B] - stack[inst.C]
				elseif op == 35 then --[[ MUL ]]
					stack[inst.A] = stack[inst.B] * stack[inst.C]
				elseif op == 36 then --[[ DIV ]]
					stack[inst.A] = stack[inst.B] / stack[inst.C]
				elseif op == 37 then --[[ MOD ]]
					stack[inst.A] = stack[inst.B] % stack[inst.C]
				elseif op == 38 then --[[ POW ]]
					stack[inst.A] = stack[inst.B] ^ stack[inst.C]
				elseif op == 39 then --[[ ADDK ]]
					stack[inst.A] = stack[inst.B] + inst.K
				elseif op == 40 then --[[ SUBK ]]
					stack[inst.A] = stack[inst.B] - inst.K
				elseif op == 41 then --[[ MULK ]]
					stack[inst.A] = stack[inst.B] * inst.K
				elseif op == 42 then --[[ DIVK ]]
					stack[inst.A] = stack[inst.B] / inst.K
				elseif op == 43 then --[[ MODK ]]
					stack[inst.A] = stack[inst.B] % inst.K
				elseif op == 44 then --[[ POWK ]]
					stack[inst.A] = stack[inst.B] ^ inst.K
				elseif op == 45 then --[[ AND ]]
					local value = stack[inst.B]
					stack[inst.A] = if value then stack[inst.C] or false else value
				elseif op == 46 then --[[ OR ]]
					local value = stack[inst.B]
					stack[inst.A] = if value then value else stack[inst.C] or false
				elseif op == 47 then --[[ ANDK ]]
					local value = stack[inst.B]
					stack[inst.A] = if value then inst.K or false else value
				elseif op == 48 then --[[ ORK ]]
					local value = stack[inst.B]
					stack[inst.A] = if value then value else inst.K or false
				elseif op == 49 then --[[ CONCAT ]]
					local B, C = inst.B, inst.C
					local success, s = pcall(table_concat, stack, "", B, C)
	
					if not success then
						s = stack[B]
	
						for i = B + 1, C do
							s ..= stack[i]
						end
					end

					stack[inst.A] = s
				elseif op == 50 then --[[ NOT ]]
					stack[inst.A] = not stack[inst.B]
				elseif op == 51 then --[[ MINUS ]]
					stack[inst.A] = -stack[inst.B]
				elseif op == 52 then --[[ LENGTH ]]
					stack[inst.A] = #stack[inst.B]
				elseif op == 53 then --[[ NEWTABLE ]]
					stack[inst.A] = table_create(inst.aux)

					pc += 1 --// adjust for aux 
				elseif op == 54 then --[[ DUPTABLE ]]
					local template = inst.K
					local serialized = {}
					for _, id in template do
						serialized[constants[id + 1]] = nil
					end
					stack[inst.A] = serialized
				elseif op == 55 then --[[ SETLIST ]]
					local A = inst.A
					local B = inst.B
					local c = inst.C - 1

					if c == LUA_MULTRET then
						c = top - B + 1
					end

					table_move(stack, B, B + c - 1, inst.aux, stack[A])

					pc += 1 --// adjust for aux 
				elseif op == 56 then --[[ FORNPREP ]]
					local A = inst.A

					local limit = stack[A]
					if not ttisnumber(limit) then
						local number = tonumber(limit)

						if number == nil then
							error("")
						end

						stack[A] = number
						limit = number
					end

					local step = stack[A + 1]
					if not ttisnumber(step) then
						local number = tonumber(step)

						if number == nil then
							error("")
						end

						stack[A + 1] = number
						step = number
					end

					local index = stack[A + 2]
					if not ttisnumber(index) then
						local number = tonumber(index)

						if number == nil then
							error("")
						end

						stack[A + 2] = number
						index = number
					end

					if step > 0 then
						if not (index <= limit) then
							pc += inst.D
						end
					else
						if not (limit <= index) then
							pc += inst.D
						end
					end
				elseif op == 57 then --[[ FORNLOOP ]]
					if interruptHook then
						interruptHook(stack, debugging, proto, module, upvals)	
					end

					local A = inst.A
					local limit = stack[A]
					local step = stack[A + 1]
					local index = stack[A + 2] + step

					stack[A + 2] = index

					if step > 0 then
						if index <= limit then
							pc += inst.D
						end
					else
						if limit <= index then
							pc += inst.D
						end
					end
				elseif op == 58 then --[[ FORGLOOP ]]
					if interruptHook then
						interruptHook(stack, debugging, proto, module, upvals)	
					end

					local A = inst.A
					local res = inst.K

					top = A + 6

					local it = stack[A]

					if (luau_settings.generalizedIteration == false) or ttisfunction(it) then 
						local vals = { it(stack[A + 1], stack[A + 2]) }
						table_move(vals, 1, res, A + 3, stack)

						if stack[A + 3] ~= nil then
							stack[A + 2] = stack[A + 3]
							pc += inst.D
						else
							pc += 1
						end
					else
						local ok, vals = coroutine_resume(generalized_iterators[inst], it, stack[A + 1], stack[A + 2])
						if not ok then
							error(vals)
						end
						if vals == LUA_GENERALIZED_TERMINATOR then 
							generalized_iterators[inst] = nil
							pc += 1
						else
							table_move(vals, 1, res, A + 3, stack)

							stack[A + 2] = stack[A + 3]
							pc += inst.D
						end
					end
				elseif op == 59 then --[[ FORGPREP_INEXT ]]
					if not ttisfunction(stack[inst.A]) then
						error("") -- FORGPREP_INEXT encountered non-function value
					end

					pc += inst.D
				elseif op == 60 then --[[ FASTCALL3 ]]
					--[[ Skipped ]]
					pc += 1 --// adjust for aux
				elseif op == 61 then --[[ FORGPREP_NEXT ]]
					if not ttisfunction(stack[inst.A]) then
						error("") -- FORGPREP_NEXT encountered non-function value
					end

					pc += inst.D
				elseif op == 63 then --[[ GETVARARGS ]]
					local A = inst.A
					local b = inst.B - 1

					if b == LUA_MULTRET then
						b = varargs.len
						top = A + b - 1
					end

					table_move(varargs.list, 1, b, A, stack)
				elseif op == 64 then --[[ DUPCLOSURE ]]
					local newPrototype = protolist[inst.K + 1] --// correct behavior would be to reuse the prototype if possible but it would not be useful here

					local nups = newPrototype.nups
					local upvalues = table_create(nups)
					stack[inst.A] = luau_wrapclosure(module, newPrototype, upvalues)

					for i = 1, nups do
						local pseudo = code[pc]
						pc += 1

						local type = pseudo.A
						if type == 0 then --// value
							local upvalue = {
								value = stack[pseudo.B],
								index = "value",--// self reference
							}
							upvalue.store = upvalue

							upvalues[i] = upvalue

							--// references dont get handled by DUPCLOSURE
						elseif type == 2 then --// upvalue
							upvalues[i] = upvals[pseudo.B + 1]
						end
					end
				elseif op == 65 then --[[ PREPVARARGS ]]
					--[[ Handled by wrapper ]]
				elseif op == 66 then --[[ LOADKX ]]
					local kv = inst.K
					stack[inst.A] = kv

					pc += 1 --// adjust for aux 
				elseif op == 67 then --[[ JUMPX ]]
					if interruptHook then
						interruptHook(stack, debugging, proto, module, upvals)	
					end

					pc += inst.E
				elseif op == 68 then --[[ FASTCALL ]]
					--[[ Skipped ]]
				elseif op == 69 then --[[ COVERAGE ]]
					inst.E += 1
				elseif op == 70 then --[[ CAPTURE ]]
					--[[ Handled by CLOSURE ]]
					error("encountered unhandled CAPTURE")
				elseif op == 71 then --[[ SUBRK ]]
					stack[inst.A] = inst.K - stack[inst.C]
				elseif op == 72 then --[[ DIVRK ]]
					stack[inst.A] = inst.K / stack[inst.C]
				elseif op == 73 then --[[ FASTCALL1 ]]
					--[[ Skipped ]]
				elseif op == 74 then --[[ FASTCALL2 ]]
					--[[ Skipped ]]
					pc += 1 --// adjust for aux
				elseif op == 75 then --[[ FASTCALL2K ]]
					--[[ Skipped ]]
					pc += 1 --// adjust for aux
				elseif op == 76 then --[[ FORGPREP ]]
					local iterator = stack[inst.A]

					if luau_settings.generalizedIteration and not ttisfunction(iterator) then
						local loopInstruction = code[pc + inst.D]
						if generalized_iterators[loopInstruction] == nil then 
							local function gen_iterator(...)
								for I1,I2,I3,I4,I5,I6,I7,I8,I9,I10 in ... do 
									coroutine_yield({I1,I2,I3,I4,I5,I6,I7,I8,I9,I10})
								end
								coroutine_yield(LUA_GENERALIZED_TERMINATOR)
							end
							generalized_iterators[loopInstruction] = coroutine_create(gen_iterator)
						end
					end

					pc += inst.D
				elseif op == 77 then --[[ JUMPXEQKNIL ]]
					local kn = inst.KN

					if (stack[inst.A] == nil) ~= kn then
						pc += inst.D
					else
						pc += 1
					end
				elseif op == 78 then --[[ JUMPXEQKB ]]
					local kv = inst.K
					local kn = inst.KN
					local ra = stack[inst.A]

					if (ttisboolean(ra) and (ra == kv)) ~= kn then
						pc += inst.D
					else
						pc += 1
					end
				elseif op == 79 then --[[ JUMPXEQKN ]]
					local kv = inst.K
					local kn = inst.KN
					local ra = stack[inst.A]

					if (ra == kv) ~= kn then
						pc += inst.D
					else
						pc += 1
					end
				elseif op == 80 then --[[ JUMPXEQKS ]]
					local kv = inst.K
					local kn = inst.KN
					local ra = stack[inst.A]

					if (ra == kv) ~= kn then
						pc += inst.D
					else
						pc += 1
					end
				elseif op == 81 then --[[ IDIV ]]
					stack[inst.A] = stack[inst.B] // stack[inst.C]
				elseif op == 82 then --[[ IDIVK ]]
					stack[inst.A] = stack[inst.B] // inst.K
				else
					error("")
				end
			end

			for i, uv in open_upvalues do
				uv.value = uv.store[uv.index]
				uv.store = uv
				uv.index = "value" --// self reference
				open_upvalues[i] = nil
			end

			for i, iter in generalized_iterators do 
				coroutine_close(iter)
				generalized_iterators[i] = nil
			end
		end

		local function wrapped(...)
			local passed = table_pack(...)
			local stack = table_create(proto.maxstacksize)
			local varargs = {
				len = 0,
				list = {},
			}

			table_move(passed, 1, proto.numparams, 0, stack)

			if proto.numparams < passed.n then
				local start = proto.numparams + 1
				local len = passed.n - proto.numparams
				varargs.len = len
				table_move(passed, start, start + len - 1, 1, varargs.list)
			end

			passed = nil

			local debugging = {pc = 0, name = "NONE"}
			local result
			if luau_settings.errorHandling then 
				result = table_pack(pcall(luau_execute, debugging, stack, proto.protos, proto.code, varargs))
			else
				result = table_pack(true, luau_execute(debugging, stack, proto.protos, proto.code, varargs))
			end

			if result[1] then
				return table_unpack(result, 2, result.n)
			else
				local message = result[2]

				if panicHook then
					panicHook(message, stack, debugging, proto, module, upvals)
				end

				if ttisstring(message) == false then
					if luau_settings.allowProxyErrors then
						error(message)
					else 
						message = type(message)
					end
				end

				if proto.lineinfoenabled then
					return error("", 0)
				else 
					return error("", 0)
				end
			end
		end

		if luau_settings.errorHandling then 
			return wrapped
		else 
			return luau_execute
		end 
	end

	return luau_wrapclosure(module, mainProto),  luau_close
end

return {
	luau_newsettings = luau_newsettings,
	luau_validatesettings = luau_validatesettings,
	luau_deserialize = luau_deserialize,
	luau_load = luau_load,
	luau_getcoverage = luau_getcoverage,
}