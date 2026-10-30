"""Render all five products from the inspected draped-v2 Blender source."""
import bpy,os,math
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'model-source','zxxr-gravity-draped-v2.blend'))
obj=bpy.data.objects['ZXXR_Gravity_Draped'];stitch=bpy.data.objects['Collar_and_hems'];scene=bpy.context.scene
scene.cycles.use_denoising=True
for slug in ['boca','flores','me-preservando','spiritual-gangsta','zxxr-rosa']:
    dark=slug in ['spiritual-gangsta','zxxr-rosa']
    obj.data.materials[2].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.022,.022,.025,1) if dark else (.80,.77,.67,1)
    for slot,name in [(0,'front'),(1,'back')]:
        for node in obj.data.materials[slot].node_tree.nodes:
            if node.type=='TEX_IMAGE':node.image=bpy.data.images.load(os.path.join(ROOT,'public','media','prints',slug+'-'+name+'.png'),check_existing=False)
    if slug=='boca':
        bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'model-source','zxxr-gravity-draped-v2.blend'))
    for side in ['front','back']:
        obj.rotation_euler.z=0 if side=='front' else math.pi;stitch.rotation_euler.z=obj.rotation_euler.z
        scene.render.filepath=os.path.join(ROOT,'public','media','draped',slug+'-'+side+'.png')
        bpy.ops.render.render(write_still=True)
        print('PRODUCT RENDER COMPLETE',slug,side,flush=True)
